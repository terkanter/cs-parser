import type { WebSocketConfig } from "./types";

export interface WebSocketConfigOptions {
  url: string;
  channel: string;
  subscribeOptions?: Record<string, any>;
  getToken: () => Promise<string>;

  // Optional overrides
  connectionTimeout?: number;
  pingInterval?: number;
  reconnectDelayMin?: number;
  reconnectDelayMax?: number;
  maxReconnectAttempts?: number;
  healthCheckInterval?: number;
  tokenRefreshInterval?: number;
  maxSilentPeriod?: number;
}

export function createWebSocketConfig(options: WebSocketConfigOptions): WebSocketConfig {
  return {
    url: options.url,
    channel: options.channel,
    subscribeOptions: options.subscribeOptions,
    getToken: options.getToken,

    // Timeouts and intervals with defaults
    connectionTimeout: options.connectionTimeout ?? 10000, // 10 seconds
    pingInterval: options.pingInterval ?? 30000, // 30 seconds
    reconnectDelayMin: options.reconnectDelayMin ?? 1000, // 1 second
    reconnectDelayMax: options.reconnectDelayMax ?? 30000, // 30 seconds
    maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
    healthCheckInterval: options.healthCheckInterval ?? 60000, // 1 minute
    tokenRefreshInterval: options.tokenRefreshInterval ?? 30 * 60 * 1000, // 30 minutes
    maxSilentPeriod: options.maxSilentPeriod ?? 5 * 60 * 1000, // 5 minutes
  };
}

export const DEFAULT_RECONNECTION_CONFIG = {
  maxAttempts: 10,
  minDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  jitter: true,
  resetAfter: 5 * 60 * 1000, // 5 minutes
};

export const DEFAULT_HEALTH_CHECK_CONFIG = {
  interval: 60000, // 1 minute
  maxSilentPeriod: 5 * 60 * 1000, // 5 minutes
  maxConnectionAge: 2 * 60 * 60 * 1000, // 2 hours
  messageRateWindow: 60 * 1000, // 1 minute window for rate calculation
};
