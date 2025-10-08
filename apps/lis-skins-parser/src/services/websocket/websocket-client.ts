import { logger } from "../../utils/logger";
import type { WebSocketConfigOptions } from "./config";
import { DEFAULT_HEALTH_CHECK_CONFIG, DEFAULT_RECONNECTION_CONFIG, createWebSocketConfig } from "./config";
import { ConnectionHealthMonitor } from "./connection-health-monitor";
import { CentrifugeConnectionManager } from "./connection-manager";
import { ExponentialBackoffStrategy } from "./reconnection-strategy";
import type {
  ConnectionEvents,
  ConnectionState,
  IConnectionHealthMonitor,
  IConnectionManager,
  IReconnectionStrategy,
} from "./types";

export interface WebSocketClientOptions<T = any> extends WebSocketConfigOptions {
  onMessage: (data: T) => Promise<void>;
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: (reason?: string) => void;

  // Optional custom strategies
  reconnectionStrategy?: IReconnectionStrategy;
  healthMonitor?: IConnectionHealthMonitor;
}

export class WebSocketClient<T = any> {
  private connectionManager: IConnectionManager;
  private healthMonitor: IConnectionHealthMonitor;
  private reconnectionStrategy: IReconnectionStrategy;
  private disposed = false;
  private messageHandlers: ((message: T) => Promise<void>)[] = [];

  constructor(private options: WebSocketClientOptions<T>) {
    const config = createWebSocketConfig(options);

    // Create strategies
    this.reconnectionStrategy =
      options.reconnectionStrategy ?? new ExponentialBackoffStrategy(DEFAULT_RECONNECTION_CONFIG);

    this.healthMonitor = options.healthMonitor ?? new ConnectionHealthMonitor(DEFAULT_HEALTH_CHECK_CONFIG);

    // Create connection events
    const events: ConnectionEvents<T> = {
      onMessage: async (data: T) => {
        for (const handler of this.messageHandlers) {
          try {
            await handler(data);
          } catch (error) {
            logger.withError(error).error("Error in message handler");
          }
        }
      },
      onStateChange: (state) => {
        logger.debug(`State changed: ${state.status}`, { connectionId: state.id });
        options.onStateChange?.(state);
      },
      onError: (error) => {
        logger.withError(error).error("WebSocket error");
        this.healthMonitor.recordError();
        options.onError?.(error);
      },
      onOpen: () => {
        logger.info("WebSocket opened");
        options.onOpen?.();
      },
      onClose: (reason) => {
        logger.info(`WebSocket closed: ${reason}`);
        options.onClose?.(reason);
      },
    };

    // Create connection manager
    this.connectionManager = new CentrifugeConnectionManager<T>(config, events, this.reconnectionStrategy);

    // Add default message handler
    this.addMessageHandler(options.onMessage);
  }

  async connect(): Promise<void> {
    if (this.disposed) {
      throw new Error("WebSocket client has been disposed");
    }

    await this.connectionManager.connect();
    this.healthMonitor.start(this.connectionManager);
  }

  async disconnect(): Promise<void> {
    this.healthMonitor.stop();
    await this.connectionManager.disconnect();
  }

  async reconnect(): Promise<void> {
    await this.connectionManager.forceReconnect();
  }

  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  getState(): ConnectionState {
    return this.connectionManager.getState();
  }

  getHealthMetrics() {
    return this.healthMonitor.getMetrics();
  }

  addMessageHandler(handler: (message: T) => Promise<void>): () => void {
    this.messageHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  async updateToken(token: string): Promise<void> {
    this.connectionManager.updateToken(token);

    // If connected, force reconnect to use new token
    if (this.isConnected()) {
      logger.info("Token updated, reconnecting with new token");
      await this.reconnect();
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.healthMonitor.stop();
    this.connectionManager.dispose();
    this.messageHandlers = [];
  }
}

// Export factory function for convenience
export function createWebSocketClient<T = any>(options: WebSocketClientOptions<T>): WebSocketClient<T> {
  return new WebSocketClient<T>(options);
}
