import { logger } from "../../utils/logger";
import type { ConnectionState, IReconnectionStrategy } from "./types";
import { ConnectionError } from "./types";

export interface ReconnectionConfig {
  maxAttempts: number;
  minDelay: number;
  maxDelay: number;
  factor: number;
  jitter: boolean;
  resetAfter: number; // Reset attempt counter after successful connection for this duration
}

export class ExponentialBackoffStrategy implements IReconnectionStrategy {
  private attemptNumber = 0;
  private lastSuccessfulConnection?: Date;
  private consecutiveFailures = 0;
  private circuitBreakerOpenUntil?: Date;

  constructor(private config: ReconnectionConfig) {}

  shouldReconnect(state: ConnectionState, error?: Error): boolean {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      logger.warn("Circuit breaker is open, skipping reconnection attempt");
      return false;
    }

    // Don't reconnect if already in a good state
    if (state.status === "connected" || state.status === "connecting") {
      return false;
    }

    // Check max attempts
    if (this.attemptNumber >= this.config.maxAttempts) {
      logger.error(`Max reconnection attempts reached (${this.config.maxAttempts})`);
      this.openCircuitBreaker();
      return false;
    }

    // Don't reconnect on non-recoverable errors
    if (error instanceof ConnectionError && !error.recoverable) {
      logger.withContext({ error: error.message }).error("Non-recoverable error, stopping reconnection");
      return false;
    }

    return true;
  }

  getNextDelay(attemptNumber: number): number {
    this.attemptNumber = attemptNumber;

    // Calculate exponential backoff
    const baseDelay = Math.min(this.config.minDelay * this.config.factor ** (attemptNumber - 1), this.config.maxDelay);

    // Add jitter if enabled
    let delay = baseDelay;
    if (this.config.jitter) {
      const jitterAmount = baseDelay * 0.2; // 20% jitter
      delay = baseDelay + (Math.random() * 2 - 1) * jitterAmount;
    }

    logger.info(
      `Next reconnection delay: ${Math.round(delay)}ms ` + `(attempt ${attemptNumber}/${this.config.maxAttempts})`,
    );

    return delay;
  }

  reset(): void {
    logger.debug("Resetting reconnection strategy");

    this.attemptNumber = 0;
    this.consecutiveFailures = 0;
    this.lastSuccessfulConnection = new Date();

    // Close circuit breaker on successful connection
    if (this.circuitBreakerOpenUntil) {
      logger.info("Closing circuit breaker after successful connection");
      this.circuitBreakerOpenUntil = undefined;
    }
  }

  recordFailure(): void {
    this.consecutiveFailures++;

    // Open circuit breaker after too many consecutive failures
    if (this.consecutiveFailures >= 5) {
      this.openCircuitBreaker();
    }
  }

  private openCircuitBreaker(): void {
    const breakerDuration = 5 * 60 * 1000; // 5 minutes
    this.circuitBreakerOpenUntil = new Date(Date.now() + breakerDuration);

    logger.error(
      `Circuit breaker opened due to ${this.consecutiveFailures} consecutive failures. ` +
        `Will retry after ${new Date(this.circuitBreakerOpenUntil).toISOString()}`,
    );
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpenUntil) {
      return false;
    }

    if (Date.now() > this.circuitBreakerOpenUntil.getTime()) {
      logger.info("Circuit breaker timeout expired, allowing reconnection");
      this.circuitBreakerOpenUntil = undefined;
      this.consecutiveFailures = 0;
      return false;
    }

    return true;
  }

  getMetrics() {
    return {
      attemptNumber: this.attemptNumber,
      consecutiveFailures: this.consecutiveFailures,
      circuitBreakerOpen: this.isCircuitBreakerOpen(),
      lastSuccessfulConnection: this.lastSuccessfulConnection,
    };
  }
}

export class NoReconnectStrategy implements IReconnectionStrategy {
  shouldReconnect(): boolean {
    return false;
  }

  getNextDelay(): number {
    return 0;
  }

  reset(): void {
    // No-op
  }
}
