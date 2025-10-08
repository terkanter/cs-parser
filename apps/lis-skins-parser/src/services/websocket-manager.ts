import { Centrifuge, type Subscription } from "centrifuge";
import WebSocket from "ws";
import { logger } from "../utils/logger";

export interface WebSocketConfig<T> {
  url: string;
  channel: string;
  subscribeOptions?: Record<string, any>;
  getToken: () => Promise<string>;
  onMessage: (data: T) => Promise<void>;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onOpen?: () => void;
}

interface Connection {
  centrifuge: Centrifuge;
  subscription: Subscription;
  config: WebSocketConfig<any>;
  isConnected: boolean;
  lastConnectedAt?: Date;
}

class WebSocketManager {
  connection: Connection | null = null;

  async startConnection<T>(config: WebSocketConfig<T>): Promise<void> {
    if (this.connection) {
      logger.warn("Connection already exists");
      return;
    }

    const centrifuge = new Centrifuge(config.url, {
      websocket: WebSocket,
      getToken: config.getToken,
    });

    const subscription = centrifuge.newSubscription(config.channel, config.subscribeOptions);

    this.connection = {
      centrifuge,
      subscription,
      config,
      isConnected: false,
    };

    this.setupHandlers();
    centrifuge.connect();
  }

  async stopConnection(): Promise<void> {
    if (!this.connection) return;

    try {
      this.connection.subscription.unsubscribe();
      this.connection.centrifuge.disconnect();
    } catch (error) {
      logger.withError(error).warn("Error during cleanup");
    }

    this.connection = null;
  }

  async forceReconnect(): Promise<void> {
    if (!this.connection) return;

    const config = this.connection.config;
    await this.stopConnection();
    await this.startConnection(config);
  }

  isConnected(): boolean {
    return this.connection?.isConnected ?? false;
  }

  getConnectionUptime(): number {
    return this.connection?.lastConnectedAt 
      ? Date.now() - this.connection.lastConnectedAt.getTime() 
      : 0;
  }

  private setupHandlers(): void {
    if (!this.connection) return;

    const { centrifuge, subscription, config } = this.connection;

    centrifuge.on("connected", () => {
      if (this.connection) {
        this.connection.isConnected = true;
        this.connection.lastConnectedAt = new Date();
      }
      logger.info("WebSocket connected");
      config.onOpen?.();
    });

    centrifuge.on("disconnected", (ctx) => {
      if (this.connection) {
        this.connection.isConnected = false;
      }
      logger.warn(`WebSocket disconnected: ${ctx.code} - ${ctx.reason}`);
      config.onClose?.();
    });

    centrifuge.on("error", (ctx) => {
      const error = new Error(ctx.error.message || "WebSocket error");
      logger.withError(error).error("WebSocket error");
      if (this.connection) {
        this.connection.isConnected = false;
      }
      config.onError?.(error);
    });

    subscription.on("publication", async (ctx) => {
      try {
        await config.onMessage(ctx.data);
      } catch (error) {
        logger.withError(error).error("Error processing message");
        config.onError?.(error as Error);
      }
    });

    subscription.on("subscribed", () => {
      logger.info(`Subscribed to ${config.channel}`);
    });

    subscription.on("error", (ctx) => {
      const error = new Error(ctx.error.message || "Subscription error");
      logger.withError(error).error("Subscription error");
      config.onError?.(error);
    });

    subscription.subscribe();
  }
}

export const websocketManager = new WebSocketManager();
