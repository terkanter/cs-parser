export interface WebSocketConfig {
  url: string;
  channel: string;
  subscribeOptions?: Record<string, any>;
  getToken: () => Promise<string>;

  // Timeouts and intervals
  connectionTimeout: number;
  pingInterval: number;
  reconnectDelayMin: number;
  reconnectDelayMax: number;
  maxReconnectAttempts: number;
  healthCheckInterval: number;
  tokenRefreshInterval: number;
  maxSilentPeriod: number;
}

export interface ConnectionState {
  id: string;
  status: "disconnected" | "connecting" | "connected" | "reconnecting" | "failed";
  connectedAt?: Date;
  lastMessageAt?: Date;
  lastPingAt?: Date;
  reconnectAttempts: number;
  error?: Error;
}

export interface ConnectionEvents<T = any> {
  onOpen: () => void;
  onClose: (reason?: string) => void;
  onError: (error: Error) => void;
  onMessage: (data: T) => Promise<void>;
  onStateChange: (state: ConnectionState) => void;
}

export interface IConnectionManager {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getState(): ConnectionState;
  forceReconnect(): Promise<void>;
  updateToken(token: string): void;
}

export interface IReconnectionStrategy {
  shouldReconnect(state: ConnectionState, error?: Error): boolean;
  getNextDelay(attemptNumber: number): number;
  reset(): void;
}

export interface IConnectionHealthMonitor {
  start(connection: IConnectionManager): void;
  stop(): void;
  checkHealth(): Promise<boolean>;
  getMetrics(): ConnectionHealthMetrics;
}

export interface ConnectionHealthMetrics {
  uptime: number;
  messageRate: number;
  lastMessageAge: number;
  reconnectCount: number;
  errorCount: number;
  isHealthy: boolean;
}

export interface WebSocketMessage<T = any> {
  data: T;
  timestamp: Date;
  channel: string;
}

export class ConnectionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true,
  ) {
    super(message);
    this.name = "ConnectionError";
  }
}

export class TokenError extends ConnectionError {
  constructor(message: string) {
    super(message, "TOKEN_ERROR", true);
    this.name = "TokenError";
  }
}

export class NetworkError extends ConnectionError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR", true);
    this.name = "NetworkError";
  }
}
