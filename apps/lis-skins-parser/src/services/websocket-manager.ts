import { Centrifuge, type Subscription } from "centrifuge";
import WebSocket from "ws";
import { logger } from "../utils/logger";

export interface WebSocketConnectionConfig<T> {
  connectionId: string;
  channel: string;
  getToken: () => Promise<string>;
  onMessage: (data: T) => Promise<void>;
  onError: (error: Error, connectionId: string) => void;
  onClose: (connectionId: string) => void;
  onOpen: (connectionId: string) => void;
}

interface CentrifugeConnection {
  centrifuge: Centrifuge;
  subscription: Subscription;
  config: WebSocketConnectionConfig<any>;
  isConnected: boolean;
  reconnectAttempts: number;
}

class CentrifugeManager {
  private connections = new Map<string, CentrifugeConnection>();

  async startConnection<T>(config: WebSocketConnectionConfig<T>): Promise<void> {
    const { connectionId } = config;
    
    if (this.connections.has(connectionId)) {
      logger.debug(`Centrifuge connection already exists for connection ${connectionId}`);
      return;
    }

    try {
      const { centrifuge, subscription } = this.createCentrifugeConnection(config);
      
        const connection: CentrifugeConnection = {
        centrifuge,
        subscription,
        config,
        isConnected: false,
        reconnectAttempts: 0,
      };

      this.connections.set(connectionId, connection);
      this.setupCentrifugeHandlers(connection);

      centrifuge.connect();

      logger.info(`Started Centrifuge connection ${connectionId}`);
    } catch (error) {
      logger.withError(error).error(`Failed to start Centrifuge connection ${connectionId}`);
      config.onError(error as Error, connectionId);
    }
  }

  async stopConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.subscription.unsubscribe();
    connection.centrifuge.disconnect();
    this.connections.delete(connectionId);
    
    logger.info(`Stopped Centrifuge connection ${connectionId}`);
  }

  async stopAllConnections(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(id => this.stopConnection(id));
    await Promise.all(promises);
    
    logger.info("Stopped all Centrifuge connections");
  }

  private createCentrifugeConnection<T>(config: WebSocketConnectionConfig<T>): { centrifuge: Centrifuge; subscription: Subscription } {
    const centrifuge = new Centrifuge("wss://ws.lis-skins.com/connection/websocket", {
      websocket: WebSocket,
      getToken: config.getToken,
    });

    const subscription = centrifuge.newSubscription(config.channel);

    return { centrifuge, subscription };
  }

  private setupCentrifugeHandlers(connection: CentrifugeConnection): void {
    const { centrifuge, subscription, config } = connection;

    centrifuge.on('connected', () => {
      connection.isConnected = true;
      connection.reconnectAttempts = 0;
      logger.info(`Centrifuge connected for connection ${config.connectionId}`);
      config.onOpen(config.connectionId);
    });

    centrifuge.on('disconnected', (ctx) => {
      connection.isConnected = false;
      logger.warn(`Centrifuge disconnected for connection ${config.connectionId}. Code: ${ctx.code}, Reason: ${ctx.reason}`);
      config.onClose(config.connectionId);
    });

    centrifuge.on('error', (ctx) => {
      const error = new Error(ctx.error.message || 'Centrifuge error');
      logger.withError(error).error(`Centrifuge error for connection ${config.connectionId}`);
      connection.isConnected = false;
      config.onError(error, config.connectionId);
    });

    subscription.on('publication', async (ctx) => {
      try {
        await config.onMessage(ctx.data);
      } catch (error) {
        logger.withError(error).error(`Error processing Centrifuge message for connection ${config.connectionId}`);
        config.onError(error as Error, config.connectionId);
      }
    });

    subscription.on('subscribed', () => {
      logger.info(`Subscribed to channel ${config.channel} for connection ${config.connectionId}`);
    });

    subscription.on('unsubscribed', () => {
      logger.info(`Unsubscribed from channel ${config.channel} for connection ${config.connectionId}`);
    });

    subscription.on('error', (ctx) => {
      const error = new Error(ctx.error.message || 'Subscription error');
      logger.withError(error).error(`Subscription error for connection ${config.connectionId}`);
      config.onError(error, config.connectionId);
    });

    subscription.subscribe();
  }
}

export const websocketManager = new CentrifugeManager();