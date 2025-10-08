import { Centrifuge, type Subscription } from "centrifuge";
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
      };

      this.connection = connection;
      this.setupCentrifugeHandlers(connection);

      centrifuge.connect();

      logger.info("Started Centrifuge connection");
    } catch (error) {
      logger.withError(error).error("Failed to start Centrifuge connection");
      config.onError(error as Error);
    }
  }

  async stopConnection(): Promise<void> {
    if (!this.connection) {
      return;
    }

    if (this.connection.reconnectTimeout) {
      clearTimeout(this.connection.reconnectTimeout);
      this.connection.reconnectTimeout = undefined;
    }

    try {
      this.connection.subscription.unsubscribe();
      this.connection.centrifuge.disconnect();
    } catch (error) {
      logger.withError(error).warn("Error during connection cleanup");
    }

    this.connection = null;
    logger.info("Stopped Centrifuge connection");
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
    return this.connection?.isConnected ?? false;
  }

  getConnectionUptime(): number {
    if (!this.connection?.lastConnectedAt) {
      return 0;
    }
    return Date.now() - this.connection.lastConnectedAt.getTime();
  }

  private createCentrifugeConnection<T>(config: WebSocketConnectionConfig<T>): {
    centrifuge: Centrifuge;
    subscription: Subscription;
  } {
    const centrifuge = new Centrifuge(config.url, {
      websocket: WebSocket,
      getToken: config.getToken,
    });

    const subscription = centrifuge.newSubscription(config.channel, config.subscribeOptions);

    return { centrifuge, subscription };
  }

  private setupCentrifugeHandlers(connection: CentrifugeConnection): void {
    const { centrifuge, subscription, config } = connection;

    centrifuge.on("connected", () => {
      connection.isConnected = true;
      connection.reconnectAttempts = 0;
      connection.lastConnectedAt = new Date();
      logger.info("Centrifuge connected for connection");
      config.onOpen();
    });

    centrifuge.on("disconnected", (ctx) => {
      connection.isConnected = false;
      logger.info("Centrifuge disconnected for connection with lifespan ", this.getConnectionUptime(), "ms");
      logger.warn(`Centrifuge disconnected for connection. Code: ${ctx.code}, Reason: ${ctx.reason}`);
      
      if (ctx.code !== 1000) { // 1000 = normal closure
        this.scheduleReconnection(connection);
      }
      
      config.onClose();
    });

    centrifuge.on("error", (ctx) => {
      const error = new Error(ctx.error.message || "Centrifuge error");
      logger.withError(error).error("Centrifuge error for connection");
      connection.isConnected = false;
      
      this.scheduleReconnection(connection);
      
      config.onError(error);
    });

    subscription.on("publication", async (ctx) => {
      try {
        await config.onMessage(ctx.data);
      } catch (error) {
        logger.withError(error).error("Error processing Centrifuge message for connection");
        config.onError(error as Error);
      }
    });

    subscription.on("subscribed", () => {
      logger.info(`Subscribed to channel ${config.channel} for connection`);
    });

    subscription.on("unsubscribed", () => {
      logger.info(`Unsubscribed from channel ${config.channel} for connection`);
    });

    subscription.on("error", (ctx) => {
      const error = new Error(ctx.error.message || "Subscription error");
      logger.withError(error).error("Subscription error for connection");
      
      this.scheduleReconnection(connection);
      
      config.onError(error);
    });

    subscription.subscribe();
  }

  private scheduleReconnection(connection: CentrifugeConnection): void {
    if (connection.reconnectTimeout) {
      return;
    }

    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts reached (${this.maxReconnectAttempts}). Stopping reconnection.`);
      return;
    }

    connection.reconnectAttempts++;
    
    const baseDelay = Math.min(
      this.baseReconnectDelay * (2 ** (connection.reconnectAttempts - 1)),
      this.maxReconnectDelay
    );
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = baseDelay + jitter;

    logger.info(
      `Scheduling reconnection attempt ${connection.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`
    );

    connection.reconnectTimeout = setTimeout(async () => {
      connection.reconnectTimeout = undefined;
      
      if (this.connection === connection) {
        logger.info(`Attempting to reconnect (attempt ${connection.reconnectAttempts})`);
        
        try {
          const freshToken = await connection.config.getToken();
          
          const updatedConfig = {
            ...connection.config,
            getToken: async () => freshToken,
          };
          
          await this.startConnection(updatedConfig);
        } catch (error) {
          logger.withError(error).error("Failed to reconnect");
          this.scheduleReconnection(connection);
        }
      }
    }, delay);
  }
}

export const websocketManager = new CentrifugeManager();
