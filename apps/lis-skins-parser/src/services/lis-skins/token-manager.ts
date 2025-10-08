import type { PlatformAccountRepository } from "../../repositories";
import { logger } from "../../utils/logger";

export interface TokenInfo {
  userId: string;
  apiKey: string;
  token: string;
  lastRefreshed: Date;
}

export interface ITokenManager {
  loadTokens(userIds: string[]): Promise<void>;
  getToken(userId?: string): Promise<string | null>;
  refreshTokens(): Promise<void>;
  addUser(userId: string): Promise<boolean>;
  removeUser(userId: string): void;
  getMetrics(): { totalTokens: number; lastRefresh: Date; tokenAges: { userId: string; age: number }[] };
  clearTokens(userIds?: string[]): void;
  getAllTokens(): Map<string, TokenInfo>;
}

export class LisSkinsTokenManager implements ITokenManager {
  private tokens = new Map<string, TokenInfo>();
  private tokenRefreshInterval: number;
  private lastRefresh = new Date();

  constructor(
    private platformAccountRepository: PlatformAccountRepository,
    private getWebSocketToken: (apiKey: string) => Promise<string>,
    config: { tokenRefreshInterval?: number } = {},
  ) {
    this.tokenRefreshInterval = config.tokenRefreshInterval ?? 30 * 60 * 1000; // 30 minutes
  }

  async loadTokens(userIds: string[]): Promise<void> {
    logger.info(`Loading tokens for ${userIds.length} users`);

    const loadPromises = userIds.map(async (userId) => {
      try {
        await this.loadTokenForUser(userId);
      } catch (error) {
        logger.withError(error).error(`Failed to load token for user ${userId}`);
      }
    });

    await Promise.all(loadPromises);

    logger.info(`Successfully loaded tokens for ${this.tokens.size} users`);
  }

  async getToken(userId?: string): Promise<string | null> {
    // Check if refresh is needed
    if (this.shouldRefresh()) {
      await this.refreshTokens();
    }

    if (userId) {
      const tokenInfo = this.tokens.get(userId);
      return tokenInfo?.token ?? null;
    }

    // Return any available token if no specific user requested
    const firstToken = Array.from(this.tokens.values())[0];
    return firstToken?.token ?? null;
  }

  async refreshTokens(): Promise<void> {
    logger.info("Refreshing WebSocket tokens...");

    const refreshPromises = Array.from(this.tokens.entries()).map(async ([userId, tokenInfo]) => {
      try {
        const newToken = await this.getWebSocketToken(tokenInfo.apiKey);

        this.tokens.set(userId, {
          ...tokenInfo,
          token: newToken,
          lastRefreshed: new Date(),
        });

        logger.debug(`Refreshed token for user ${userId}`);
      } catch (error) {
        logger.withError(error).error(`Failed to refresh token for user ${userId}`);
        // Don't remove the token, keep the old one
      }
    });

    await Promise.all(refreshPromises);
    this.lastRefresh = new Date();

    logger.info(`Refreshed tokens for ${this.tokens.size} users`);
  }

  clearTokens(userIds?: string[]): void {
    if (userIds) {
      for (const userId of userIds) {
        this.tokens.delete(userId);
      }
      logger.debug(`Cleared tokens for ${userIds.length} users`);
    } else {
      this.tokens.clear();
      logger.debug("Cleared all tokens");
    }
  }

  getAllTokens(): Map<string, TokenInfo> {
    return new Map(this.tokens);
  }

  async addUser(userId: string): Promise<boolean> {
    try {
      await this.loadTokenForUser(userId);
      return true;
    } catch (error) {
      logger.withError(error).error(`Failed to add user ${userId}`);
      return false;
    }
  }

  removeUser(userId: string): void {
    this.tokens.delete(userId);
  }

  private async loadTokenForUser(userId: string): Promise<void> {
    const auth = await this.platformAccountRepository.findLisSkinsAccountByUserId(userId);

    if (!auth) {
      throw new Error(`No LIS-Skins authentication found for user ${userId}`);
    }

    const apiKey = (auth.credentials as { apiKey: string }).apiKey;
    const token = await this.getWebSocketToken(apiKey);

    this.tokens.set(userId, {
      userId,
      apiKey,
      token,
      lastRefreshed: new Date(),
    });

    logger.debug(`Loaded token for user ${userId}`);
  }

  private shouldRefresh(): boolean {
    return Date.now() - this.lastRefresh.getTime() > this.tokenRefreshInterval;
  }

  getMetrics() {
    return {
      totalTokens: this.tokens.size,
      lastRefresh: this.lastRefresh,
      tokenAges: Array.from(this.tokens.values()).map((info) => ({
        userId: info.userId,
        age: Date.now() - info.lastRefreshed.getTime(),
      })),
    };
  }
}
