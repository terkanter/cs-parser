import type { BuyRequestQuery } from "@repo/api-core";
import { Platform, type BuyRequest } from "@repo/prisma";
import { logger } from "../utils/logger";
import { rabbitmqService } from "./rabbitmq";
import { websocketManager, type WebSocketConnectionConfig } from "./websocket-manager";
import { BuyRequestRepository, PlatformAccountRepository } from "../repositories";
import { LIS_SKINS_API_URL } from "../consts";

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
  event: 'obtained_skin_added' | 'obtained_skin_deleted' | 'obtained_skin_price_changed';
}

export class LisSkinsService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private activeBuyRequests = new Set<string>();

  constructor(
    private buyRequestRepository: BuyRequestRepository,
    private platformAccountRepository: PlatformAccountRepository
  ) {}

  async startMonitoring(buyRequest: BuyRequest): Promise<void> {
    try {
      const auth = await this.platformAccountRepository.findLisSkinsAccountByUserId(
        buyRequest.createdByUserId
      );
      
      if (!auth) {
        logger.error(`No LIS-Skins authentication found for user ${buyRequest.createdByUserId}`);
        return;
      }

      const config: WebSocketConnectionConfig<LisSkinsWebSocketItem> = {
        connectionId: buyRequest.id,
        channel: this.buildChannel(buyRequest.query as BuyRequestQuery),
        getToken: () => this.getWebSocketToken(auth.credentials as string),
        onMessage: (data) => this.handleMessage(buyRequest, data),
        onError: (error, connectionId) => this.handleError(error, connectionId),
        onClose: (connectionId) => this.handleClose(connectionId),
        onOpen: (connectionId) => this.handleOpen(connectionId),
      };

      await websocketManager.startConnection(config);
    } catch (error) {
      logger.withError(error).error(`Failed to start monitoring for buy request ${buyRequest.id}`);
    }
  }

  async stopMonitoring(buyRequestId: string): Promise<void> {
    await websocketManager.stopConnection(buyRequestId);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info("LIS-Skins service is already running");
      return;
    }

    logger.info("Starting LIS-Skins service...");
    this.isRunning = true;

    await this.initializeConnections();

    this.intervalId = setInterval(async () => {
      await this.updateConnections();
    }, 30000);
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

    await websocketManager.stopAllConnections();
    this.activeBuyRequests.clear();
  }

  async stopAllMonitoring(): Promise<void> {
    await websocketManager.stopAllConnections();
  }

  private async handleMessage(buyRequest: BuyRequest, item: LisSkinsWebSocketItem): Promise<void> {
    try {
      // Фильтруем только нужные события
      if (item.event === 'obtained_skin_deleted') {
        logger.debug(`Skipping deleted item: ${item.name}`);
        return;
      }

      // Обрабатываем только obtained_skin_added и obtained_skin_price_changed
      if (item.event !== 'obtained_skin_added' && item.event !== 'obtained_skin_price_changed') {
        logger.debug(`Skipping unknown event: ${item.event}`);
        return;
      }

      const query = buyRequest.query as BuyRequestQuery;

      if (this.matchesPaintSeed(item, query)) {
        const foundItem = {
          name: item.name,
          price: item.price,
          float: parseFloat(item.item_float),
          paintSeed: item.item_paint_seed || 0,
          quality: this.extractQuality(item.name),
          url: `https://lis-skins.com/item/${item.id}`,
          imageUrl: undefined,
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
          .info(`Found matching item via WebSocket: ${item.name} - $${item.price} (${item.event})`);
      }
    } catch (error) {
      logger.withError(error).error(`Error processing message for buy request ${buyRequest.id}`);
    }
  }

  private handleError(error: Error, connectionId: string): void {
    logger.withError(error).error(`WebSocket error for buy request ${connectionId}`);
  }

  private handleClose(connectionId: string): void {
    logger.warn(`WebSocket closed for buy request ${connectionId}`);
  }

  private handleOpen(connectionId: string): void {
    logger.info(`WebSocket opened for buy request ${connectionId}`);
  }

  private matchesPaintSeed(item: LisSkinsWebSocketItem, query: BuyRequestQuery): boolean {
    if (!query.paint_seed || query.paint_seed.length === 0) {
      return true; 
    }

    if (item.item_paint_seed === null) {
      return false;
    }

    return query.paint_seed.some(range => {
      if (range.gte !== undefined && item.item_paint_seed! < range.gte) {
        return false;
      }
      if (range.lte !== undefined && item.item_paint_seed! > range.lte) {
        return false;
      }
      return true;
    });
  }

  private extractQuality(itemName: string): string {
    // Extract quality from item name (e.g., "AK-47 | Redline (Field-Tested)" -> "Field-Tested")
    const qualityMatch = itemName.match(/\(([^)]+)\)$/);
    return qualityMatch ? qualityMatch[1] : "Unknown";
  }

  private async initializeConnections(): Promise<void> {
    try {
      logger.info("Initializing WebSocket connections...");

      const buyRequests = await this.buyRequestRepository.findActiveLisSkinsBuyRequests();
      
      for (const buyRequest of buyRequests) {
        try {
          await this.startMonitoring(buyRequest);
          this.activeBuyRequests.add(buyRequest.id);
        } catch (error) {
          logger.withError(error).error(`Error starting monitoring for buy request ${buyRequest.id}`);
        }
      }

      logger.info(`Initialized ${buyRequests.length} WebSocket connections`);
    } catch (error) {
      logger.withError(error).error("Error initializing WebSocket connections");
    }
  }

  private async updateConnections(): Promise<void> {
    try {
      const buyRequests = await this.buyRequestRepository.findActiveLisSkinsBuyRequests();
      const currentBuyRequestIds = new Set(buyRequests.map(br => br.id));

      for (const buyRequest of buyRequests) {
        if (!this.activeBuyRequests.has(buyRequest.id)) {
          try {
            await this.startMonitoring(buyRequest);
            this.activeBuyRequests.add(buyRequest.id);
            logger.info(`Started new monitoring for buy request ${buyRequest.id}`);
          } catch (error) {
            logger.withError(error).error(`Error starting monitoring for new buy request ${buyRequest.id}`);
          }
        }
      }

      for (const buyRequestId of this.activeBuyRequests) {
        if (!currentBuyRequestIds.has(buyRequestId)) {
          try {
            await this.stopMonitoring(buyRequestId);
            this.activeBuyRequests.delete(buyRequestId);
            logger.info(`Stopped monitoring for inactive buy request ${buyRequestId}`);
          } catch (error) {
            logger.withError(error).error(`Error stopping monitoring for buy request ${buyRequestId}`);
          }
        }
      }
    } catch (error) {
      logger.withError(error).error("Error updating WebSocket connections");
    }
  }

  private buildChannel(query: BuyRequestQuery): string {
    const params = new URLSearchParams();
    
    params.append('game', 'csgo');
    params.append('sort_by', 'newest');

    if (query.float && query.float.length > 0) {
      const floatRange = query.float[0]; 
      if (floatRange.gte !== undefined) {
        params.append('float_from', floatRange.gte.toString());
      }
      if (floatRange.lte !== undefined) {
        params.append('float_to', floatRange.lte.toString());
      }
    }

    if (query.price && query.price.length > 0) {
      const priceRange = query.price[0];
      if (priceRange.gte !== undefined) {
        params.append('price_from', priceRange.gte.toString());
      }
      if (priceRange.lte !== undefined) {
        params.append('price_to', priceRange.lte.toString());
      }
    }

    if (query.item && query.item.length > 0) {
      query.item.forEach(name => {
        params.append('names[]', name);
      });
    }

    return `/?${params.toString()}`;
  }

  private async getWebSocketToken(apiKey: string): Promise<string> {
    try {
      const response = await fetch(`${LIS_SKINS_API_URL}/user/get-ws-token`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Unauthorized: Invalid API key');
        }
        throw new Error(`Unexpected status code ${response.status}`);
      }

      const json = await response.json() as { data: { token: string } };
      return json.data.token;
    } catch (error) {
      logger.withError(error).error('Failed to get WebSocket token');
      throw error;
    }
  }
}

const buyRequestRepository = new BuyRequestRepository();
const platformAccountRepository = new PlatformAccountRepository();

export const lisSkinsService = new LisSkinsService(buyRequestRepository, platformAccountRepository);
