import { logger } from "../../utils/logger";
import type { ConnectionHealthMetrics, IConnectionHealthMonitor, IConnectionManager } from "./types";

export interface HealthCheckConfig {
  interval: number;
  maxSilentPeriod: number;
  maxConnectionAge: number;
  messageRateWindow: number;
}

export class ConnectionHealthMonitor implements IConnectionHealthMonitor {
  private connection?: IConnectionManager;
  private intervalId?: NodeJS.Timeout;
  private messageTimestamps: Date[] = [];
  private startTime: Date = new Date();
  private reconnectCount = 0;
  private errorCount = 0;
  private lastHealthCheck?: Date;

  constructor(private config: HealthCheckConfig) {}

  start(connection: IConnectionManager): void {
    this.stop();

    this.connection = connection;
    this.startTime = new Date();
    this.messageTimestamps = [];

    logger.info("Starting connection health monitor", {
      interval: this.config.interval,
      maxSilentPeriod: this.config.maxSilentPeriod,
    });

    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.config.interval);

    // Perform initial health check
    this.performHealthCheck();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.connection = undefined;
    logger.info("Stopped connection health monitor");
  }

  async checkHealth(): Promise<boolean> {
    if (!this.connection) {
      return false;
    }

    const state = this.connection.getState();
    const metrics = this.getMetrics();

    // Check basic connectivity
    if (state.status !== "connected") {
      logger.debug("Health check: not connected", { status: state.status });
      return false;
    }

    // Check for stale connection
    if (metrics.lastMessageAge > this.config.maxSilentPeriod) {
      logger.warn("Health check: connection appears stale", {
        lastMessageAge: Math.round(metrics.lastMessageAge / 1000) + "s",
        maxSilentPeriod: Math.round(this.config.maxSilentPeriod / 1000) + "s",
      });
      return false;
    }

    // Check connection age
    if (metrics.uptime > this.config.maxConnectionAge) {
      logger.info("Health check: connection too old", {
        uptime: Math.round(metrics.uptime / 1000 / 60) + "m",
        maxAge: Math.round(this.config.maxConnectionAge / 1000 / 60) + "m",
      });
      return false;
    }

    // Check message rate (if we expect regular messages)
    if (metrics.messageRate === 0 && metrics.uptime > 60000) {
      logger.warn("Health check: no messages received", {
        uptime: Math.round(metrics.uptime / 1000) + "s",
      });
    }

    return metrics.isHealthy;
  }

  recordMessage(): void {
    const now = new Date();
    this.messageTimestamps.push(now);

    // Keep only messages within the rate window
    const cutoff = new Date(now.getTime() - this.config.messageRateWindow);
    this.messageTimestamps = this.messageTimestamps.filter((ts) => ts > cutoff);
  }

  recordReconnect(): void {
    this.reconnectCount++;
  }

  recordError(): void {
    this.errorCount++;
  }

  getMetrics(): ConnectionHealthMetrics {
    const now = Date.now();
    const state = this.connection?.getState();

    const uptime = now - this.startTime.getTime();
    const lastMessageAt = state?.lastMessageAt || this.startTime;
    const lastMessageAge = now - lastMessageAt.getTime();

    // Calculate message rate
    const recentMessages = this.messageTimestamps.filter((ts) => ts.getTime() > now - this.config.messageRateWindow);
    const messageRate = (recentMessages.length / this.config.messageRateWindow) * 1000 * 60; // messages per minute

    const isHealthy =
      state?.status === "connected" &&
      lastMessageAge < this.config.maxSilentPeriod &&
      uptime < this.config.maxConnectionAge;

    return {
      uptime,
      messageRate,
      lastMessageAge,
      reconnectCount: this.reconnectCount,
      errorCount: this.errorCount,
      isHealthy,
    };
  }

  private async performHealthCheck(): Promise<void> {
    try {
      this.lastHealthCheck = new Date();

      const isHealthy = await this.checkHealth();
      const metrics = this.getMetrics();

      logger.debug("Health check completed", {
        isHealthy,
        uptime: Math.round(metrics.uptime / 1000) + "s",
        messageRate: metrics.messageRate.toFixed(2) + "/min",
        lastMessageAge: Math.round(metrics.lastMessageAge / 1000) + "s",
        reconnectCount: metrics.reconnectCount,
        errorCount: metrics.errorCount,
      });

      if (!isHealthy && this.connection?.isConnected()) {
        logger.warn("Connection unhealthy, triggering reconnection");
        await this.connection.forceReconnect();
      }
    } catch (error) {
      logger.withError(error).error("Error during health check");
      this.recordError();
    }
  }
}
