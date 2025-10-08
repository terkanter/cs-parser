import type { BuyRequestQuery } from "@repo/api-core";
import type { BuyRequest } from "@repo/prisma";
import { Platform } from "@repo/prisma";
import { logger } from "../../utils/logger";

export interface LisSkinsWebSocketItem {
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

export interface FoundItem {
  id: number;
  name: string;
  price: number;
  float: number;
  paintSeed: number;
  paintSeedTier?: number;
  quality: string;
  unlockAt: string | null;
}

export interface FoundItemMessage {
  buyRequestId: string;
  userId: string;
  platform: Platform;
  item: FoundItem;
  foundAt: Date;
}

export interface IMessageHandler {
  handleMessage(item: LisSkinsWebSocketItem, buyRequests: BuyRequest[]): Promise<FoundItemMessage[]>;
  setConnectionStartTime(time: Date): void;
}

export class LisSkinsMessageHandler implements IMessageHandler {
  private connectionStartTime: Date = new Date();

  constructor(private onItemFound: (message: FoundItemMessage) => Promise<void>) {}

  setConnectionStartTime(time: Date): void {
    this.connectionStartTime = time;
  }

  async handleMessage(item: LisSkinsWebSocketItem, buyRequests: BuyRequest[]): Promise<FoundItemMessage[]> {
    const foundItems: FoundItemMessage[] = [];

    try {
      // Skip old items
      const itemCreatedAt = new Date(item.created_at);
      if (itemCreatedAt < this.connectionStartTime) {
        return foundItems;
      }

      // Skip deleted items
      if (item.event === "obtained_skin_deleted") {
        logger.debug(`Skipping deleted item: ${item.name}`);
        return foundItems;
      }

      // Only process added or price changed events
      if (item.event !== "obtained_skin_added" && item.event !== "obtained_skin_price_changed") {
        logger.debug(`Skipping unknown event: ${item.event}`);
        return foundItems;
      }

      // Check against all buy requests
      for (const buyRequest of buyRequests) {
        const query = buyRequest.query as unknown as BuyRequestQuery;

        if (this.matchesQuery(item, query)) {
          const foundItem = this.createFoundItem(item, query);

          const message: FoundItemMessage = {
            buyRequestId: buyRequest.id,
            userId: buyRequest.createdByUserId,
            platform: Platform.LIS_SKINS,
            item: foundItem,
            foundAt: new Date(),
          };

          foundItems.push(message);

          // Notify about found item
          await this.onItemFound(message);

          logger
            .withContext({
              buyRequestId: buyRequest.id,
              itemName: item.name,
              price: item.price,
              paintSeed: item.item_paint_seed,
              event: item.event,
              createdAt: itemCreatedAt.toISOString(),
            })
            .info(
              `Found matching item: ${item.name} - $${item.price} ` + `(${item.event}) for request ${buyRequest.id}`,
            );
        }
      }
    } catch (error) {
      logger.withError(error).error("Error processing WebSocket message");
    }

    return foundItems;
  }

  private matchesQuery(item: LisSkinsWebSocketItem, query: BuyRequestQuery): boolean {
    // Check item name
    if (!item.name.toLowerCase().includes(query.item.toLowerCase())) {
      return false;
    }

    // Check float
    if (query.float && item.item_float) {
      const itemFloat = Number.parseFloat(item.item_float);
      if (query.float.gte !== undefined && itemFloat < query.float.gte) {
        return false;
      }
      if (query.float.lte !== undefined && itemFloat > query.float.lte) {
        return false;
      }
    }

    // Check price
    if (query.price && item.price) {
      if (query.price.gte !== undefined && item.price < query.price.gte) {
        return false;
      }
      if (query.price.lte !== undefined && item.price > query.price.lte) {
        return false;
      }
    }

    // Check paint seed
    if (query.paint_seed && query.paint_seed.length > 0) {
      if (item.item_paint_seed === null) {
        return false;
      }

      const paintSeedMatches = query.paint_seed.some((seedConfig) => item.item_paint_seed === seedConfig.value);

      if (!paintSeedMatches) {
        return false;
      }
    }

    return true;
  }

  private createFoundItem(item: LisSkinsWebSocketItem, query: BuyRequestQuery): FoundItem {
    return {
      id: item.id,
      name: item.name,
      price: item.price,
      float: Number.parseFloat(item.item_float),
      paintSeed: item.item_paint_seed || 0,
      paintSeedTier: this.getPaintSeedTier(item.item_paint_seed, query),
      quality: this.extractQuality(item.name),
      unlockAt: item.unlock_at || null,
    };
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
}
