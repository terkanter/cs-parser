import type { BuyRequestQuery } from "@repo/api-core";
import { type BuyRequest, Platform } from "@repo/prisma";
import { LIS_SKINS_API_URL, LIS_SKINS_WEBSOCKET_URL } from "../consts";
import { BuyRequestRepository, PlatformAccountRepository } from "../repositories";
import { UserRepository } from "../repositories/user.repository";
import { logger } from "../utils/logger";
import { rabbitmqService } from "./rabbitmq";
import { type WebSocketConfig, websocketManager } from "./websocket-manager";

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
  private activeBuyRequests = new Map<string, BuyRequest>();
  private userTokens = new Map<string, string>();
  private userApiKeys = new Map<string, string>();
  private connectionStartTime = new Date();
  private lastTokenRefresh = new Date();

  constructor(
    private buyRequestRepository: BuyRequestRepository,
    private platformAccountRepository: PlatformAccountRepository,
    private userRepository: UserRepository,
  ) {}

  async addBuyRequest(buyRequest: BuyRequest): Promise<void> {
    this.activeBuyRequests.set(buyRequest.id, buyRequest);
    logger.info(`Added buy request ${buyRequest.id} to monitoring`);

    if (!websocketManager.connection && this.activeBuyRequests.size === 1) {
      await this.startConnection();
    }
  }

  async removeBuyRequest(buyRequestId: string): Promise<void> {
    if (this.activeBuyRequests.has(buyRequestId)) {
      this.activeBuyRequests.delete(buyRequestId);
      logger.info(`Removed buy request ${buyRequestId} from monitoring`);

      if (this.activeBuyRequests.size === 0 && websocketManager.connection) {
        await websocketManager.stopConnection();
      }
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    logger.info("Starting LIS-Skins service...");
    this.isRunning = true;

    await this.initializeConnections();
    this.intervalId = setInterval(() => this.updateConnections(), 30000);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info("Stopping LIS-Skins service...");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await websocketManager.stopConnection();
    this.activeBuyRequests.clear();
    this.userTokens.clear();
    this.userApiKeys.clear();
    await rabbitmqService.close();
  }

  async stopAllMonitoring(): Promise<void> {
    await websocketManager.stopConnection();
    this.activeBuyRequests.clear();
  }

  private async startConnection(): Promise<void> {
    if (websocketManager.connection || this.userTokens.size === 0) return;

    this.connectionStartTime = new Date();

    const config: WebSocketConfig<LisSkinsWebSocketItem> = {
      url: LIS_SKINS_WEBSOCKET_URL,
      channel: "public:obtained-skins",
      subscribeOptions: {
        since: { offset: 0, epoch: new Date().toISOString() },
        data: { game: "csgo", sort_by: "newest" },
      },
      getToken: async () => {
        if (Date.now() - this.lastTokenRefresh.getTime() > 30 * 60 * 1000) {
          await this.refreshTokens();
        }
        return Array.from(this.userTokens.values())[0];
      },
      onMessage: (data) => this.handleMessage(data),
      onOpen: () => {
        logger.info("WebSocket connected");
        this.connectionStartTime = new Date();
      },
    };

    await websocketManager.startConnection(config);
  }


  private async handleMessage(item: LisSkinsWebSocketItem): Promise<void> {
    try {
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

          logger.info(`Found item: ${item.name} - $${item.price} (${item.event})`);
        }
      }
    } catch (error) {
      logger.withError(error).error("Error processing WebSocket message");
    }
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
    const buyRequests = await this.buyRequestRepository.findActiveLisSkinsBuyRequests();
    if (buyRequests.length === 0) return;

    await this.loadUserTokens(buyRequests);
    for (const br of buyRequests) {
      this.activeBuyRequests.set(br.id, br);
    }
    await this.startConnection();

    logger.info(`Initialized connection for ${buyRequests.length} buy requests`);
  }

  private async updateConnections(): Promise<void> {
    const buyRequests = await this.buyRequestRepository.findActiveLisSkinsBuyRequests();
    const currentIds = new Set(buyRequests.map(br => br.id));

    // Add new requests
    const newRequests = buyRequests.filter(br => !this.activeBuyRequests.has(br.id));
    if (newRequests.length > 0) {
      await this.loadUserTokensForNewRequests(newRequests);
      for (const br of newRequests) {
        this.addBuyRequest(br);
      }
    }

    // Remove inactive requests
    for (const id of this.activeBuyRequests.keys()) {
      if (!currentIds.has(id)) {
        this.removeBuyRequest(id);
      }
    }

    this.cleanupUnusedTokens(buyRequests);
  }

  private async refreshTokens(): Promise<void> {
    const promises = Array.from(this.userApiKeys.entries()).map(async ([userId, apiKey]) => {
      try {
        const token = await this.getWebSocketToken(apiKey);
        this.userTokens.set(userId, token);
      } catch (error) {
        logger.withError(error).error(`Failed to refresh token for user ${userId}`);
      }
    });

    await Promise.all(promises);
    this.lastTokenRefresh = new Date();
    logger.info(`Refreshed tokens for ${this.userTokens.size} users`);
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
