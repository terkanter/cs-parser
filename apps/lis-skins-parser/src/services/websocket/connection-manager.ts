import type { Subscription } from "centrifuge";
import { Centrifuge, State as CentrifugeState } from "centrifuge";
import WebSocket from "ws";
import { logger } from "../../utils/logger";
import { ConnectionStateMachine } from "./connection-state-machine";
import type {
  ConnectionEvents,
  ConnectionState,
  IConnectionManager,
  IReconnectionStrategy,
  WebSocketConfig,
  WebSocketMessage,
} from "./types";
import { ConnectionError, NetworkError, TokenError } from "./types";

export class CentrifugeConnectionManager<T = any> implements IConnectionManager {
  private stateMachine: ConnectionStateMachine;
  private centrifuge?: Centrifuge;
  private subscription?: Subscription;
  private reconnectTimeout?: NodeJS.Timeout;
  private currentToken?: string;
  private disposed = false;

  constructor(
    private config: WebSocketConfig,
    private events: ConnectionEvents<T>,
    private reconnectionStrategy: IReconnectionStrategy,
  ) {
    this.stateMachine = new ConnectionStateMachine({
      id: this.generateConnectionId(),
      status: "disconnected",
      reconnectAttempts: 0,
    });

    // Subscribe to state changes
    this.stateMachine.onStateChange((state) => {
      this.events.onStateChange(state);
    });
  }

  async connect(): Promise<void> {
    if (this.disposed) {
      throw new Error("Connection manager has been disposed");
    }

    const state = this.stateMachine.getState();

    if (state.status === "connected" || state.status === "connecting") {
      logger.warn(`Already ${state.status}, skipping connect`);
      return;
    }

    await this.stateMachine.transition("connect");

    try {
      // Get fresh token
      this.currentToken = await this.config.getToken();

      // Create and initialize connection
      await this.initializeConnection();
    } catch (error) {
      logger.withError(error).error("Failed to connect");

      await this.stateMachine.transition("fail", {
        error: error as Error,
      });

      // Handle reconnection
      this.handleConnectionError(error as Error);

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.stateMachine.isInState("disconnected")) {
      return;
    }

    logger.info("Disconnecting...");

    // Cancel any pending reconnection
    this.cancelReconnection();

    // Transition to disconnected state
    await this.stateMachine.transition("disconnect");

    // Clean up resources
    this.cleanup();

    this.events.onClose("Manual disconnect");
  }

  isConnected(): boolean {
    const state = this.stateMachine.getState();

    // Double-check with Centrifuge state
    if (this.centrifuge) {
      const actualState = this.centrifuge.state;
      const isActuallyConnected = actualState === CentrifugeState.Connected;

      if (state.status === "connected" && !isActuallyConnected) {
        logger.warn("State mismatch detected, updating state");
        this.stateMachine.updateState({ status: "disconnected" });
        return false;
      }
    }

    return state.status === "connected";
  }

  getState(): ConnectionState {
    return this.stateMachine.getState();
  }

  async forceReconnect(): Promise<void> {
    logger.info("Forcing reconnection...");

    await this.disconnect();

    // Reset reconnection strategy
    this.reconnectionStrategy.reset();

    // Small delay before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 100));

    await this.connect();
  }

  updateToken(token: string): void {
    this.currentToken = token;
  }

  dispose(): void {
    this.disposed = true;
    this.disconnect();
  }

  private async initializeConnection(): Promise<void> {
    try {
      this.cleanup();

      // Create Centrifuge instance
      this.centrifuge = new Centrifuge(this.config.url, {
        websocket: WebSocket,
        getToken: async () => {
          if (!this.currentToken) {
            throw new TokenError("No token available");
          }
          return this.currentToken;
        },
        timeout: this.config.connectionTimeout,
        // Disable built-in reconnect - we handle it ourselves
        minReconnectDelay: 999999999,
        maxReconnectDelay: 999999999,
      });

      // Set up event handlers
      this.setupCentrifugeHandlers();

      // Create subscription
      this.subscription = this.centrifuge.newSubscription(this.config.channel, this.config.subscribeOptions);

      this.setupSubscriptionHandlers();

      // Connect
      this.centrifuge.connect();

      // Subscribe to channel
      this.subscription.subscribe();
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  private setupCentrifugeHandlers(): void {
    if (!this.centrifuge) return;

    this.centrifuge.on("connected", async () => {
      logger.info(`Centrifuge connected [${this.getState().id}]`);

      await this.stateMachine.transition("connected", {
        connectedAt: new Date(),
        reconnectAttempts: 0,
      });

      this.reconnectionStrategy.reset();
      this.events.onOpen();
    });

    this.centrifuge.on("disconnected", (ctx) => {
      logger.warn(`Centrifuge disconnected: ${ctx.reason} (code: ${ctx.code})`);

      this.stateMachine.updateState({
        status: "disconnected",
        error: new NetworkError(`Disconnected: ${ctx.reason}`),
      });

      this.events.onClose(ctx.reason);

      // Handle reconnection for abnormal closures
      if (ctx.code !== 1000) {
        this.scheduleReconnection();
      }
    });

    this.centrifuge.on("error", (ctx) => {
      const error = new ConnectionError(ctx.error.message || "Unknown error", "CENTRIFUGE_ERROR");

      logger.withError(error).error("Centrifuge error");

      this.events.onError(error);

      // Special handling for transport closed
      if (error.message.includes("transport closed")) {
        logger.error("Transport closed detected, forcing disconnect");
        this.centrifuge?.disconnect();
      }

      this.handleConnectionError(error);
    });
  }

  private setupSubscriptionHandlers(): void {
    if (!this.subscription) return;

    this.subscription.on("publication", async (ctx) => {
      try {
        const message: WebSocketMessage<T> = {
          data: ctx.data,
          timestamp: new Date(),
          channel: this.config.channel,
        };

        // Update last message timestamp
        this.stateMachine.updateState({
          lastMessageAt: message.timestamp,
        });

        await this.events.onMessage(message.data);
      } catch (error) {
        logger.withError(error).error("Error handling message");
        this.events.onError(error as Error);
      }
    });

    this.subscription.on("subscribed", () => {
      logger.info(`Subscribed to channel: ${this.config.channel}`);
    });

    this.subscription.on("unsubscribed", () => {
      logger.info(`Unsubscribed from channel: ${this.config.channel}`);
    });

    this.subscription.on("error", (ctx) => {
      const error = new ConnectionError(ctx.error.message || "Subscription error", "SUBSCRIPTION_ERROR");

      logger.withError(error).error("Subscription error");
      this.events.onError(error);
    });
  }

  private handleConnectionError(error: Error): void {
    const state = this.stateMachine.getState();

    if (this.reconnectionStrategy.shouldReconnect(state, error)) {
      this.scheduleReconnection();
    } else {
      logger.error("Reconnection not allowed by strategy");
    }
  }

  private scheduleReconnection(): void {
    if (this.reconnectTimeout || this.disposed) {
      return;
    }

    const state = this.stateMachine.getState();
    const attemptNumber = state.reconnectAttempts + 1;

    const delay = this.reconnectionStrategy.getNextDelay(attemptNumber);

    logger.info(`Scheduling reconnection in ${Math.round(delay)}ms`);

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = undefined;

      if (this.disposed) {
        return;
      }

      await this.stateMachine.transition("reconnect", {
        reconnectAttempts: attemptNumber,
      });

      try {
        // Get fresh token
        this.currentToken = await this.config.getToken();

        await this.initializeConnection();
      } catch (error) {
        logger.withError(error).error("Reconnection failed");

        await this.stateMachine.transition("fail", {
          error: error as Error,
        });

        // Try again if allowed
        this.handleConnectionError(error as Error);
      }
    }, delay);
  }

  private cancelReconnection(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
  }

  private cleanup(): void {
    try {
      if (this.subscription) {
        this.subscription.removeAllListeners();
        this.subscription.unsubscribe();
        this.subscription = undefined;
      }

      if (this.centrifuge) {
        this.centrifuge.removeAllListeners();
        this.centrifuge.disconnect();
        this.centrifuge = undefined;
      }
    } catch (error) {
      logger.withError(error).warn("Error during cleanup");
    }
  }

  private generateConnectionId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
