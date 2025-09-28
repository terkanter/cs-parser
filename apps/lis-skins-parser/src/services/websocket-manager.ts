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
}

class CentrifugeManager {
connection: CentrifugeConnection | null = null;

  async startConnection<T>(config: WebSocketConnectionConfig<T>): Promise<void> {
    
    try {
      const { centrifuge, subscription } = this.createCentrifugeConnection(config);
      
      const connection: CentrifugeConnection = {
        centrifuge,
        subscription,
        config,
        isConnected: false,
        reconnectAttempts: 0,
      };

      this.setupCentrifugeHandlers(connection);

      centrifuge.connect();

      logger.info(`Started Centrifuge connection`);
    } catch (error) {
      logger.withError(error).error(`Failed to start Centrifuge connection`);
      config.onError(error as Error);
    }
  }

  async stopConnection(): Promise<void> {
    if (!this.connection) {
      return;
    }

    this.connection.subscription.unsubscribe();
    this.connection.centrifuge.disconnect();
    
    logger.info(`Stopped Centrifuge connection`);
  }

  private createCentrifugeConnection<T>(config: WebSocketConnectionConfig<T>): { centrifuge: Centrifuge; subscription: Subscription } {
    const centrifuge = new Centrifuge(config.url, {
      websocket: WebSocket,
      getToken: config.getToken,
    });

    const subscription = centrifuge.newSubscription(config.channel, config.subscribeOptions);

    return { centrifuge, subscription };
  }

  private setupCentrifugeHandlers(connection: CentrifugeConnection): void {
    const { centrifuge, subscription, config } = connection;

    centrifuge.on('connected', () => {
      connection.isConnected = true;
      connection.reconnectAttempts = 0;
      logger.info(`Centrifuge connected for connection`);
      config.onOpen();
    });

    centrifuge.on('disconnected', (ctx) => {
      connection.isConnected = false;
      logger.warn(`Centrifuge disconnected for connection. Code: ${ctx.code}, Reason: ${ctx.reason}`);
      config.onClose();
    });

    centrifuge.on('error', (ctx) => {
      const error = new Error(ctx.error.message || 'Centrifuge error');
      logger.withError(error).error(`Centrifuge error for connection`);
      connection.isConnected = false;
      config.onError(error);
    });

    subscription.on('publication', async (ctx) => {
      try {
        await config.onMessage(ctx.data);
      } catch (error) {
        logger.withError(error).error(`Error processing Centrifuge message for connection`);
        config.onError(error as Error);
      }
    });

    subscription.on('subscribed', () => {
      logger.info(`Subscribed to channel ${config.channel} for connection`);
    });

    subscription.on('unsubscribed', () => {
      logger.info(`Unsubscribed from channel ${config.channel} for connection`);
    });

    subscription.on('error', (ctx) => {
      const error = new Error(ctx.error.message || 'Subscription error');
      logger.withError(error).error(`Subscription error for connection`);
      config.onError(error);
    });

    subscription.subscribe();
  }
}

export const websocketManager = new CentrifugeManager();