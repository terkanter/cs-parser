import { Centrifuge, State, type Subscription } from "centrifuge";
import WebSocket from "ws";
import { logger } from "../utils/logger";

export interface WebSocketConnectionConfig<T> {
  url: string;
  channel: string;
  subscribeOptions?: Record<string, any>; // Parameters for subscription
  getToken: () => Promise<string>;
  onMessage: (data: T) => Promise<void>;
  onError: (error: Error) => void;
  onClose: () => void;
  onOpen: () => void;
}

interface CentrifugeConnection {
  centrifuge: Centrifuge;
  subscription: Subscription;
  config: WebSocketConnectionConfig<any>;
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnectedAt?: Date;
  reconnectTimeout?: NodeJS.Timeout;
  isReconnecting: boolean;
  connectionId: string;
}

class CentrifugeManager {
  connection: CentrifugeConnection | null = null;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000; // 1 second
  private maxReconnectDelay = 30000; // 30 seconds

  async startConnection<T>(config: WebSocketConnectionConfig<T>): Promise<void> {
    try {
      await this.stopConnection();

      const { centrifuge, subscription } = this.createCentrifugeConnection(config);

      const connection: CentrifugeConnection = {
        centrifuge,
        subscription,
        config,
        isConnected: false,
        reconnectAttempts: 0,
        isReconnecting: false,
        connectionId: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      this.connection = connection;
      this.setupCentrifugeHandlers(connection);

      centrifuge.connect();

      logger.info(`Started Centrifuge connection ${connection.connectionId}`);
    } catch (error) {
      logger.withError(error).error("Failed to start Centrifuge connection");
      config.onError(error as Error);
    }
  }

  async stopConnection(): Promise<void> {
    if (!this.connection) {
      return;
    }

    const connectionId = this.connection.connectionId;
    logger.info(`Stopping Centrifuge connection ${connectionId}`);

    // Mark as reconnecting to prevent multiple reconnection attempts
    this.connection.isReconnecting = true;

    if (this.connection.reconnectTimeout) {
      clearTimeout(this.connection.reconnectTimeout);
      this.connection.reconnectTimeout = undefined;
    }

    try {
      // Remove all event listeners first
      this.connection.subscription.removeAllListeners();
      this.connection.centrifuge.removeAllListeners();

      // Then unsubscribe and disconnect
      this.connection.subscription.unsubscribe();
      this.connection.centrifuge.disconnect();
    } catch (error) {
      logger.withError(error).warn(`Error during connection cleanup for ${connectionId}`);
    }

    this.connection = null;
    logger.info(`Stopped Centrifuge connection ${connectionId}`);
  }

  async forceReconnect(): Promise<void> {
    if (!this.connection) {
      logger.warn("No active connection to reconnect");
      return;
    }

    logger.info("Forcing reconnection...");
    const config = this.connection.config;
    await this.startConnection(config);
  }

  isConnected(): boolean {
    if (!this.connection) {
      return false;
    }

    // Check both our flag and the actual Centrifuge state
    const centrifugeState = this.connection.centrifuge.state;
    const isActuallyConnected = centrifugeState === State.Connected;

    // If there's a mismatch, update our flag
    if (this.connection.isConnected !== isActuallyConnected) {
      logger.warn(
        `Connection state mismatch for ${this.connection.connectionId}: internal=${this.connection.isConnected}, actual=${isActuallyConnected}`,
      );
      this.connection.isConnected = isActuallyConnected;
    }

    return isActuallyConnected;
  }

  getConnectionUptime(): number {
    if (!this.connection?.lastConnectedAt) {
      return 0;
    }
    return Date.now() - this.connection.lastConnectedAt.getTime();
  }

  getCentrifugeState(): State | null {
    return this.connection?.centrifuge.state ?? null;
  }

  private createCentrifugeConnection<T>(config: WebSocketConnectionConfig<T>): {
    centrifuge: Centrifuge;
    subscription: Subscription;
  } {
    const centrifuge = new Centrifuge(config.url, {
      websocket: WebSocket,
      getToken: config.getToken,
      // Add timeout settings to detect connection issues faster
      timeout: 10000, // 10 seconds
      // Add ping interval to keep connection alive
      // ping: true,
      // pingInterval: 30000, // 30 seconds
      // Disable automatic reconnect - we handle it manually
      minReconnectDelay: 10000000, // Very high value to effectively disable
      maxReconnectDelay: 10000000,
    });

    const subscription = centrifuge.newSubscription(config.channel, config.subscribeOptions);

    return { centrifuge, subscription };
  }

  private setupCentrifugeHandlers(connection: CentrifugeConnection): void {
    const { centrifuge, subscription, config, connectionId } = connection;

    centrifuge.on("connected", () => {
      connection.isConnected = true;
      connection.reconnectAttempts = 0;
      connection.lastConnectedAt = new Date();
      logger.info(`Centrifuge connected for ${connectionId}`);
      config.onOpen();
    });

    centrifuge.on("disconnected", (ctx) => {
      connection.isConnected = false;
      const uptime = this.getConnectionUptime();
      logger.warn(
        `Centrifuge disconnected for ${connectionId}. Code: ${ctx.code}, Reason: ${ctx.reason}, Uptime: ${uptime}ms`,
      );

      if (ctx.code !== 1000) {
        // 1000 = normal closure
        this.scheduleReconnection(connection);
      }

      config.onClose();
    });

    centrifuge.on("error", (ctx) => {
      const errorMessage = ctx.error?.message || "Unknown Centrifuge error";
      const error = new Error(errorMessage);

      logger.withError(error).error(`Centrifuge error for ${connectionId}: ${errorMessage}`);
      connection.isConnected = false;

      // Check if this is a transport closed error
      if (errorMessage.includes("transport closed")) {
        logger.error(`Transport closed error detected for ${connectionId}. Forcing reconnection...`);
        // Force disconnect to ensure clean state
        try {
          centrifuge.disconnect();
        } catch (e) {
          logger.withError(e).warn(`Failed to force disconnect for ${connectionId}`);
        }
      }

      this.scheduleReconnection(connection);
      config.onError(error);
    });

    subscription.on("publication", async (ctx) => {
      try {
        await config.onMessage(ctx.data);
      } catch (error) {
        logger.withError(error).error(`Error processing message for ${connectionId}`);
        config.onError(error as Error);
      }
    });

    subscription.on("subscribed", () => {
      logger.info(`Subscribed to channel ${config.channel} for ${connectionId}`);
    });

    subscription.on("unsubscribed", () => {
      logger.info(`Unsubscribed from channel ${config.channel} for ${connectionId}`);
    });

    subscription.on("error", (ctx) => {
      const errorMessage = ctx.error?.message || "Unknown subscription error";
      const error = new Error(errorMessage);
      logger.withError(error).error(`Subscription error for ${connectionId}: ${errorMessage}`);

      this.scheduleReconnection(connection);
      config.onError(error);
    });

    subscription.subscribe();
  }

  private scheduleReconnection(connection: CentrifugeConnection): void {
    // Prevent multiple reconnection attempts
    if (connection.reconnectTimeout || connection.isReconnecting) {
      logger.debug(`Reconnection already scheduled for ${connection.connectionId}`);
      return;
    }

    // Check if this connection is still active
    if (this.connection?.connectionId !== connection.connectionId) {
      logger.warn(`Skipping reconnection for stale connection ${connection.connectionId}`);
      return;
    }

    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(
        `Max reconnection attempts reached (${this.maxReconnectAttempts}) for ${connection.connectionId}. Stopping reconnection.`,
      );
      connection.isReconnecting = false;
      return;
    }

    connection.reconnectAttempts++;
    connection.isReconnecting = true;

    const baseDelay = Math.min(
      this.baseReconnectDelay * 2 ** (connection.reconnectAttempts - 1),
      this.maxReconnectDelay,
    );
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = baseDelay + jitter;

    logger.info(
      `Scheduling reconnection attempt ${connection.reconnectAttempts}/${this.maxReconnectAttempts} for ${connection.connectionId} in ${Math.round(delay)}ms`,
    );

    connection.reconnectTimeout = setTimeout(async () => {
      connection.reconnectTimeout = undefined;

      // Double-check this is still the active connection
      if (this.connection?.connectionId !== connection.connectionId) {
        logger.warn(`Connection ${connection.connectionId} is no longer active, skipping reconnection`);
        return;
      }

      logger.info(`Attempting to reconnect ${connection.connectionId} (attempt ${connection.reconnectAttempts})`);

      try {
        // Get fresh token before reconnecting
        const freshToken = await connection.config.getToken();

        const updatedConfig = {
          ...connection.config,
          getToken: async () => freshToken,
        };

        await this.startConnection(updatedConfig);
      } catch (error) {
        logger.withError(error).error(`Failed to reconnect ${connection.connectionId}`);

        // Only retry if this is still the active connection
        if (this.connection?.connectionId === connection.connectionId) {
          connection.isReconnecting = false; // Reset flag before scheduling next attempt
          this.scheduleReconnection(connection);
        }
      }
    }, delay);
  }
}

export const websocketManager = new CentrifugeManager();
