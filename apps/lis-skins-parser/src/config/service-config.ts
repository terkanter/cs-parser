export interface ServiceConfig {
  lisSkinsService: {
    websocketUrl: string;
    apiUrl: string;
    channel: string;
    updateInterval: number;
    healthCheckInterval: number;
    tokenRefreshInterval: number;
  };
  websocket: {
    connectionTimeout: number;
    pingInterval: number;
    reconnectDelayMin: number;
    reconnectDelayMax: number;
    maxReconnectAttempts: number;
    maxSilentPeriod: number;
  };
  reconnection: {
    maxAttempts: number;
    minDelay: number;
    maxDelay: number;
    factor: number;
    jitter: boolean;
    resetAfter: number;
    circuitBreakerDuration: number;
  };
  healthCheck: {
    interval: number;
    maxSilentPeriod: number;
    maxConnectionAge: number;
    messageRateWindow: number;
  };
}

export const defaultServiceConfig: ServiceConfig = {
  lisSkinsService: {
    websocketUrl: process.env.LIS_SKINS_WEBSOCKET_URL || "wss://lis-skins.com/websocket",
    apiUrl: process.env.LIS_SKINS_API_URL || "https://api.lis-skins.com/",
    channel: "public:obtained-skins",
    updateInterval: 30000, // 30 seconds
    healthCheckInterval: 60000, // 1 minute
    tokenRefreshInterval: 30 * 60 * 1000, // 30 minutes
  },
  websocket: {
    connectionTimeout: 10000, // 10 seconds
    pingInterval: 30000, // 30 seconds
    reconnectDelayMin: 1000, // 1 second
    reconnectDelayMax: 30000, // 30 seconds
    maxReconnectAttempts: 10,
    maxSilentPeriod: 5 * 60 * 1000, // 5 minutes
  },
  reconnection: {
    maxAttempts: 10,
    minDelay: 1000,
    maxDelay: 30000,
    factor: 2,
    jitter: true,
    resetAfter: 5 * 60 * 1000, // 5 minutes
    circuitBreakerDuration: 5 * 60 * 1000, // 5 minutes
  },
  healthCheck: {
    interval: 60000, // 1 minute
    maxSilentPeriod: 5 * 60 * 1000, // 5 minutes
    maxConnectionAge: 2 * 60 * 60 * 1000, // 2 hours
    messageRateWindow: 60 * 1000, // 1 minute
  },
};

// Allow overriding config from environment
export function getServiceConfig(): ServiceConfig {
  const config = { ...defaultServiceConfig };

  // Override from environment if available
  const envOverrides = {
    lisSkinsService: {
      updateInterval: process.env.LIS_SKINS_UPDATE_INTERVAL
        ? Number.parseInt(process.env.LIS_SKINS_UPDATE_INTERVAL)
        : undefined,
      healthCheckInterval: process.env.LIS_SKINS_HEALTH_CHECK_INTERVAL
        ? Number.parseInt(process.env.LIS_SKINS_HEALTH_CHECK_INTERVAL)
        : undefined,
      tokenRefreshInterval: process.env.LIS_SKINS_TOKEN_REFRESH_INTERVAL
        ? Number.parseInt(process.env.LIS_SKINS_TOKEN_REFRESH_INTERVAL)
        : undefined,
    },
    websocket: {
      connectionTimeout: process.env.WEBSOCKET_CONNECTION_TIMEOUT
        ? Number.parseInt(process.env.WEBSOCKET_CONNECTION_TIMEOUT)
        : undefined,
      maxReconnectAttempts: process.env.WEBSOCKET_MAX_RECONNECT_ATTEMPTS
        ? Number.parseInt(process.env.WEBSOCKET_MAX_RECONNECT_ATTEMPTS)
        : undefined,
    },
  };

  // Deep merge overrides
  return deepMerge(config, envOverrides);
}

function deepMerge(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    for (const key of Object.keys(source)) {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else if (source[key] !== undefined) {
        Object.assign(output, { [key]: source[key] });
      }
    }
  }

  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item);
}
