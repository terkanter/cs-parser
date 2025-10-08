import type { BuyRequestQuery } from "@repo/api-core";
import { type BuyRequest, Platform } from "@repo/prisma";
import { LIS_SKINS_API_URL, LIS_SKINS_WEBSOCKET_URL } from "../consts";
import { BuyRequestRepository, PlatformAccountRepository } from "../repositories";
import { UserRepository } from "../repositories/user.repository";
import { logger } from "../utils/logger";
import { rabbitmqService } from "./rabbitmq";
import { type WebSocketConnectionConfig, websocketManager } from "./websocket-manager";

interface LisSkinsWebSocketItem {
  id: number;
  name: string;
  price: number;
  name_tag: string | null;
  stickers: Array<{
    name: string;
    image: string;
    wear: number;
    slot: number;
  }>;
  unlock_at: string | null;
  created_at: string;
  item_float: string;
  item_class_id: string;
  item_paint_seed: number | null;
  item_paint_index: number | null;
  event: "obtained_skin_added" | "obtained_skin_deleted" | "obtained_skin_price_changed";
}

export class LisSkinsService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private activeBuyRequests = new Map<string, BuyRequest>(); // buyRequestId -> BuyRequest
  private userTokens = new Map<string, string>(); // userId -> authToken
  private userApiKeys = new Map<string, string>(); // userId -> apiKey
  private connectionStartTime: Date = new Date();
  private lastTokenRefresh: Date = new Date();
  private lastMessageReceivedAt: Date = new Date();
  private tokenRefreshInterval = 30 * 60 * 1000; // 30 minutes
  private healthCheckInterval_ms = 60 * 1000; // 1 minute

  constructor(
    private buyRequestRepository: BuyRequestRepository,
    private platformAccountRepository: PlatformAccountRepository,
    private userRepository: UserRepository,
  ) {}

  async addBuyRequest(buyRequest: BuyRequest): Promise<void> {
    this.activeBuyRequests.set(buyRequest.id, buyRequest);
    logger.info(`Added buy request ${buyRequest.id} to monitoring`);

    if (!websocketManager.connection && this.activeBuyRequests.size === 1) {
      await this.startGlobalConnection();
    }
  }

  async removeBuyRequest(buyRequestId: string): Promise<void> {
    if (this.activeBuyRequests.has(buyRequestId)) {
      this.activeBuyRequests.delete(buyRequestId);
      logger.info(`Removed buy request ${buyRequestId} from monitoring`);

      if (this.activeBuyRequests.size === 0 && websocketManager.connection) {
        await this.stopGlobalConnection();
      }
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info("LIS-Skins service is already running");
      return;
    }

    logger.info("Starting LIS-Skins service...");
    this.isRunning = true;

    await this.initializeConnections();

    // Update connections every 30 seconds
    this.intervalId = setInterval(async () => {
      await this.updateConnections();
    }, 30000);

    // Health check every minute
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckInterval_ms);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info("Stopping LIS-Skins service...");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    await websocketManager.stopConnection();
    this.activeBuyRequests.clear();
    this.userTokens.clear();
    this.userApiKeys.clear();

    await rabbitmqService.close();
  }

  async stopAllMonitoring(): Promise<void> {
    await this.stopGlobalConnection();
    this.activeBuyRequests.clear();
  }

  private async startGlobalConnection(): Promise<void> {
    if (websocketManager.connection) {
      return;
    }

    try {
      if (this.userTokens.size === 0) {
        logger.error("No user tokens available for WebSocket connection");
        return;
      }

      const authToken = Array.from(this.userTokens.values())[0];
      this.connectionStartTime = new Date();

      const config: WebSocketConnectionConfig<LisSkinsWebSocketItem> = {
        url: LIS_SKINS_WEBSOCKET_URL,
        channel: "public:obtained-skins",
        subscribeOptions: {
          since: {
            offset: 0,
            epoch: new Date().toISOString(),
          },
          data: {
            game: "csgo",
            sort_by: "newest",
          },
        },
        getToken: async () => {
          // Check if we need to refresh tokens
          if (Date.now() - this.lastTokenRefresh.getTime() > this.tokenRefreshInterval) {
            await this.refreshTokens();
          }

          // Return the first available token (could be refreshed)
          const tokens = Array.from(this.userTokens.values());
          return tokens.length > 0 ? tokens[0] : authToken;
        },
        onMessage: (data) => this.handleGlobalMessage(data),
        onError: (error) => {
          logger.withError(error).error("Global WebSocket error for connection");
          // WebSocket manager handles reconnection automatically
        },
        onClose: () => {
          logger.warn("Global WebSocket closed for connection");
          // WebSocket manager handles reconnection automatically
        },
        onOpen: () => this.handleGlobalOpen(),
      };

      await websocketManager.startConnection(config);
    } catch (error) {
      logger.withError(error).error("Failed to start global WebSocket connection");
      throw error; // Let websocket manager handle reconnection
    }
  }

  private async stopGlobalConnection(): Promise<void> {
    await websocketManager.stopConnection();
  }

  private async handleGlobalMessage(item: LisSkinsWebSocketItem): Promise<void> {
    try {
      // Update last message timestamp
      this.lastMessageReceivedAt = new Date();

      const itemCreatedAt = new Date(item.created_at);
      if (itemCreatedAt < this.connectionStartTime) {
        return;
      }

      if (item.event === "obtained_skin_deleted") {
        logger.debug(`Skipping deleted item: ${item.name}`);
        return;
      }

      if (item.event !== "obtained_skin_added" && item.event !== "obtained_skin_price_changed") {
        logger.debug(`Skipping unknown event: ${item.event}`);
        return;
      }

      for (const [_, buyRequest] of this.activeBuyRequests) {
        const query = buyRequest.query as unknown as BuyRequestQuery;

        if (this.matchesQuery(item, query)) {
          const paintSeedTier = this.getPaintSeedTier(item.item_paint_seed, query);

          const foundItem = {
            id: item.id,
            name: item.name,
            price: item.price,
            float: Number.parseFloat(item.item_float),
            paintSeed: item.item_paint_seed || 0,
            paintSeedTier,
            quality: this.extractQuality(item.name),
            unlockAt: item.unlock_at || null,
          };

          await rabbitmqService.publishFoundItem({
            buyRequestId: buyRequest.id,
            userId: buyRequest.createdByUserId,
            platform: Platform.LIS_SKINS,
            item: foundItem,
            foundAt: new Date(),
          });

          logger
            .withContext({
              buyRequestId: buyRequest.id,
              itemName: item.name,
              price: item.price,
              paintSeed: item.item_paint_seed,
              event: item.event,
            })
            .info(
              `Found matching item via WebSocket: ${item.name} - $${item.price} (${item.event}) ${itemCreatedAt.toISOString()}`,
            );
        }
      }
    } catch (error) {
      logger.withError(error).error("Error processing global WebSocket message");
    }
  }

  private handleGlobalOpen(): void {
    logger.info("Global WebSocket opened for connection");
    this.connectionStartTime = new Date();
    this.lastMessageReceivedAt = new Date();
  }

  private matchesQuery(item: LisSkinsWebSocketItem, query: BuyRequestQuery): boolean {
    if (!item.name.toLowerCase().includes(query.item.toLowerCase())) {
      return false;
    }

    if (query.float && item.item_float) {
      const itemFloat = Number.parseFloat(item.item_float);
      if (query.float.gte !== undefined && itemFloat < query.float.gte) {
        return false;
      }
      if (query.float.lte !== undefined && itemFloat > query.float.lte) {
        return false;
      }
    }

    if (query.price && item.price) {
      if (query.price.gte !== undefined && item.price < query.price.gte) {
        return false;
      }
      if (query.price.lte !== undefined && item.price > query.price.lte) {
        return false;
      }
    }

    if (query.paint_seed && query.paint_seed.length > 0) {
      if (item.item_paint_seed === null) {
        return false;
      }

      const paintSeedMatches = query.paint_seed.some((seedConfig) => item.item_paint_seed === seedConfig.value!);

      if (!paintSeedMatches) return false;
    }

    return true;
  }

  private extractQuality(itemName: string): string {
    const qualityMatch = itemName.match(/\(([^)]+)\)$/);
    return qualityMatch ? qualityMatch[1] : "Unknown";
  }

  private getPaintSeedTier(paintSeed: number | null, query: BuyRequestQuery): number | undefined {
    if (paintSeed === null || !query.paint_seed) {
      return undefined;
    }

    for (const seedConfig of query.paint_seed) {
      if (seedConfig.value !== undefined && seedConfig.value === paintSeed) {
        return seedConfig.tier;
      }
    }

    return undefined;
  }

  private async loadUserTokens(buyRequests: BuyRequest[]): Promise<void> {
    const userIds = [...new Set(buyRequests.map((br) => br.createdByUserId))];

    this.userTokens.clear();
    this.userApiKeys.clear();

    for (const userId of userIds) {
      try {
        const auth = await this.platformAccountRepository.findLisSkinsAccountByUserId(userId);

        if (!auth) {
          logger.error(`No LIS-Skins authentication found for user ${userId}`);
          continue;
        }

        const apiKey = (auth.credentials as { apiKey: string }).apiKey;
        const authToken = await this.getWebSocketToken(apiKey);

        this.userApiKeys.set(userId, apiKey);
        this.userTokens.set(userId, authToken);

        logger.debug(`Loaded auth token for user ${userId}`);
      } catch (error) {
        logger.withError(error).error(`Failed to load auth token for user ${userId}`);
      }
    }

    this.lastTokenRefresh = new Date();
    logger.info(`Loaded tokens for ${this.userTokens.size} users`);
  }

  private async loadUserTokensForNewRequests(newBuyRequests: BuyRequest[]): Promise<void> {
    const newUserIds = [...new Set(newBuyRequests.map((br) => br.createdByUserId))].filter(
      (userId) => !this.userTokens.has(userId),
    );

    if (newUserIds.length === 0) {
      return;
    }

    for (const userId of newUserIds) {
      try {
        const auth = await this.platformAccountRepository.findLisSkinsAccountByUserId(userId);

        if (!auth) {
          logger.error(`No LIS-Skins authentication found for user ${userId}`);
          continue;
        }

        const apiKey = (auth.credentials as { apiKey: string }).apiKey;
        const authToken = await this.getWebSocketToken(apiKey);

        this.userApiKeys.set(userId, apiKey);
        this.userTokens.set(userId, authToken);

        logger.debug(`Loaded auth token for new user ${userId}`);
      } catch (error) {
        logger.withError(error).error(`Failed to load auth token for user ${userId}`);
      }
    }

    logger.info(`Loaded tokens for ${newUserIds.length} new users`);
  }

  private cleanupUnusedTokens(activeBuyRequests: BuyRequest[]): void {
    const activeUserIds = new Set(activeBuyRequests.map((br) => br.createdByUserId));
    const tokensToRemove: string[] = [];

    for (const userId of this.userTokens.keys()) {
      if (!activeUserIds.has(userId)) {
        tokensToRemove.push(userId);
      }
    }

    for (const userId of tokensToRemove) {
      this.userTokens.delete(userId);
      this.userApiKeys.delete(userId);
      logger.debug(`Removed token for inactive user ${userId}`);
    }

    if (tokensToRemove.length > 0) {
      logger.info(`Cleaned up tokens for ${tokensToRemove.length} inactive users`);
    }
  }

  private async initializeConnections(): Promise<void> {
    try {
      logger.info("Initializing WebSocket connection...");

      const buyRequests = await this.buyRequestRepository.findActiveLisSkinsBuyRequests();

      if (buyRequests.length === 0) {
        logger.info("No active buy requests found");
        return;
      }

      await this.loadUserTokens(buyRequests);

      for (const buyRequest of buyRequests) {
        this.activeBuyRequests.set(buyRequest.id, buyRequest);
      }

      await this.startGlobalConnection();

      logger.info(`Initialized global WebSocket connection for ${buyRequests.length} buy requests`);
    } catch (error) {
      logger.withError(error).error("Error initializing WebSocket connection");
    }
  }

  private async updateConnections(): Promise<void> {
    try {
      const buyRequests = await this.buyRequestRepository.findActiveLisSkinsBuyRequests();
      const currentBuyRequestIds = new Set(buyRequests.map((br) => br.id));

      const newBuyRequests = buyRequests.filter((br) => !this.activeBuyRequests.has(br.id));
      if (newBuyRequests.length > 0) {
        await this.loadUserTokensForNewRequests(newBuyRequests);
      }

      for (const buyRequest of buyRequests) {
        if (!this.activeBuyRequests.has(buyRequest.id)) {
          await this.addBuyRequest(buyRequest);
          logger.info(`Added new buy request ${buyRequest.id} to monitoring`);
        }
      }

      for (const buyRequestId of this.activeBuyRequests.keys()) {
        if (!currentBuyRequestIds.has(buyRequestId)) {
          await this.removeBuyRequest(buyRequestId);
          logger.info(`Removed inactive buy request ${buyRequestId} from monitoring`);
        }
      }

      this.cleanupUnusedTokens(buyRequests);
    } catch (error) {
      logger.withError(error).error("Error updating WebSocket connections");
    }
  }

  private async refreshTokens(): Promise<void> {
    try {
      logger.info("Refreshing WebSocket tokens...");

      const refreshPromises = Array.from(this.userApiKeys.entries()).map(async ([userId, apiKey]) => {
        try {
          const newToken = await this.getWebSocketToken(apiKey);
          this.userTokens.set(userId, newToken);
          logger.debug(`Refreshed token for user ${userId}`);
        } catch (error) {
          logger.withError(error).error(`Failed to refresh token for user ${userId}`);
        }
      });

      await Promise.all(refreshPromises);
      this.lastTokenRefresh = new Date();

      logger.info(`Refreshed tokens for ${this.userTokens.size} users`);
    } catch (error) {
      logger.withError(error).error("Error refreshing tokens");
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      if (!this.isRunning || this.activeBuyRequests.size === 0) {
        return;
      }

      const isConnected = websocketManager.isConnected();
      const uptime = websocketManager.getConnectionUptime();
      const centrifugeState = websocketManager.getCentrifugeState();

      logger.info(
        `Health check: connected=${isConnected}, state=${centrifugeState}, uptime=${uptime}ms, requests=${this.activeBuyRequests.size}, tokens=${this.userTokens.size}`,
      );

      // If not connected and we have active requests, try to reconnect
      if (!isConnected && this.activeBuyRequests.size > 0) {
        logger.warn(
          `WebSocket not connected (state: ${centrifugeState}) but have active requests. Attempting to reconnect...`,
        );

        // First try to refresh tokens in case they're expired
        await this.refreshTokens();

        // Then attempt to start connection
        await this.startGlobalConnection();
      }

      // If connection is very old (> 2 hours), force reconnect to get fresh tokens
      const maxConnectionAge = 2 * 60 * 60 * 1000; // 2 hours
      if (isConnected && uptime > maxConnectionAge) {
        logger.info("Connection is old, forcing reconnect for fresh tokens...");
        await this.refreshTokens();
        await websocketManager.forceReconnect();
      }

      // Additional check: if we think we're connected but haven't received any data in a while
      // This could indicate a "zombie" connection
      const timeSinceLastMessage = Date.now() - this.lastMessageReceivedAt.getTime();
      const maxSilentPeriod = 5 * 60 * 1000; // 5 minutes
      if (isConnected && timeSinceLastMessage > maxSilentPeriod && uptime > maxSilentPeriod) {
        logger.warn(
          `Connection appears to be stale (no messages for ${Math.round(timeSinceLastMessage / 1000)}s). Forcing reconnect...`,
        );
        await websocketManager.forceReconnect();
      }
    } catch (error) {
      logger.withError(error).error("Error during health check");

      // If health check itself fails, try to recover
      try {
        logger.error("Health check failed, attempting recovery...");
        await this.refreshTokens();
        await websocketManager.forceReconnect();
      } catch (recoveryError) {
        logger.withError(recoveryError).error("Failed to recover from health check error");
      }
    }
  }

  private async getWebSocketToken(apiKey: string): Promise<string> {
    try {
      const response = await fetch(`${LIS_SKINS_API_URL}user/get-ws-token`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Unauthorized: Invalid API key");
        }
        throw new Error(`Unexpected status code ${response.status}`);
      }

      const json = (await response.json()) as { data: { token: string } };
      return json.data.token;
    } catch (error) {
      logger.withError(error).error("Failed to get WebSocket token");
      throw error;
    }
  }

  async buyItem(userId: string, id: number, price: number): Promise<{ success: boolean; message: string }> {
    try {
      const auth = await this.platformAccountRepository.findLisSkinsAccountByUserId(userId);
      if (!auth) {
        return { success: false, message: "Не найдена авторизация для LIS-Skins" };
      }

      const apiKey = (auth.credentials as { apiKey: string }).apiKey;

      const response = await fetch(`${LIS_SKINS_API_URL}user/balance`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const json = (await response.json()) as { data: { balance: number } };

      const balance = json.data.balance;

      if (balance < price) {
        return { success: false, message: "Недостаточно средств на балансе" };
      }

      const user = await this.userRepository.getUserById(userId);

      if (!user) {
        return { success: false, message: "Не найден пользователь" };
      }

      if (!user.steamTradeUrl) {
        return { success: false, message: "Не найден Steam Trade URL" };
      }

      const url = new URL(user.steamTradeUrl);
      const partner = url.searchParams.get("partner");
      const token = url.searchParams.get("token");

      const buyResponse = await fetch(`${LIS_SKINS_API_URL}market/buy`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        method: "POST",
        body: JSON.stringify({
          ids: [id],
          partner,
          token,
        }),
      });

      const buyText = await buyResponse.text();
      if (!buyResponse.ok) {
        return { success: false, message: `Не удалось купить предмет: ${buyText}` };
      }

      return { success: true, message: "Предмет успешно куплен!" };
    } catch (error) {
      logger.withError(error).error("Error buying item");
      return { success: false, message: "Произошла ошибка при покупке" };
    }
  }
}

const buyRequestRepository = new BuyRequestRepository();
const platformAccountRepository = new PlatformAccountRepository();
const userRepository = new UserRepository();

export const lisSkinsService = new LisSkinsService(buyRequestRepository, platformAccountRepository, userRepository);
