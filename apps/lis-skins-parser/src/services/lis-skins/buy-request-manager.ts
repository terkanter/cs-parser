import type { BuyRequest } from "@repo/prisma";
import type { BuyRequestRepository } from "../../repositories";
import { logger } from "../../utils/logger";

export interface IBuyRequestManager {
  loadActiveBuyRequests(): Promise<BuyRequest[]>;
  addBuyRequest(buyRequest: BuyRequest): void;
  removeBuyRequest(buyRequestId: string): void;
  getBuyRequests(): BuyRequest[];
  hasBuyRequests(): boolean;
  updateBuyRequests(): Promise<{ added: string[]; removed: string[] }>;
  getUserIds(): string[];
  getBuyRequest(id: string): BuyRequest | undefined;
  getMetrics(): { total: number; byUser: Record<string, number>; ids: string[] };
}

export class BuyRequestManager implements IBuyRequestManager {
  private activeBuyRequests = new Map<string, BuyRequest>();

  constructor(private buyRequestRepository: BuyRequestRepository) {}

  async loadActiveBuyRequests(): Promise<BuyRequest[]> {
    try {
      const buyRequests = await this.buyRequestRepository.findActiveLisSkinsBuyRequests();

      this.activeBuyRequests.clear();

      for (const buyRequest of buyRequests) {
        this.activeBuyRequests.set(buyRequest.id, buyRequest);
      }

      logger.info(`Loaded ${buyRequests.length} active buy requests`);

      return buyRequests;
    } catch (error) {
      logger.withError(error).error("Failed to load active buy requests");
      throw error;
    }
  }

  addBuyRequest(buyRequest: BuyRequest): void {
    this.activeBuyRequests.set(buyRequest.id, buyRequest);
    logger.info(`Added buy request ${buyRequest.id} to monitoring`);
  }

  removeBuyRequest(buyRequestId: string): void {
    if (this.activeBuyRequests.delete(buyRequestId)) {
      logger.info(`Removed buy request ${buyRequestId} from monitoring`);
    }
  }

  getBuyRequests(): BuyRequest[] {
    return Array.from(this.activeBuyRequests.values());
  }

  getBuyRequest(id: string): BuyRequest | undefined {
    return this.activeBuyRequests.get(id);
  }

  hasBuyRequests(): boolean {
    return this.activeBuyRequests.size > 0;
  }

  getUserIds(): string[] {
    const userIds = new Set<string>();

    for (const buyRequest of this.activeBuyRequests.values()) {
      userIds.add(buyRequest.createdByUserId);
    }

    return Array.from(userIds);
  }

  async updateBuyRequests(): Promise<{ added: string[]; removed: string[] }> {
    try {
      const currentBuyRequests = await this.buyRequestRepository.findActiveLisSkinsBuyRequests();
      const currentIds = new Set(currentBuyRequests.map((br) => br.id));

      const added: string[] = [];
      const removed: string[] = [];

      // Find new buy requests
      for (const buyRequest of currentBuyRequests) {
        if (!this.activeBuyRequests.has(buyRequest.id)) {
          this.addBuyRequest(buyRequest);
          added.push(buyRequest.id);
        }
      }

      // Find removed buy requests
      for (const [id] of this.activeBuyRequests) {
        if (!currentIds.has(id)) {
          this.removeBuyRequest(id);
          removed.push(id);
        }
      }

      if (added.length > 0 || removed.length > 0) {
        logger.info(`Buy requests updated: ${added.length} added, ${removed.length} removed`);
      }

      return { added, removed };
    } catch (error) {
      logger.withError(error).error("Failed to update buy requests");
      throw error;
    }
  }

  getMetrics() {
    const byUser = new Map<string, number>();

    for (const buyRequest of this.activeBuyRequests.values()) {
      const count = byUser.get(buyRequest.createdByUserId) || 0;
      byUser.set(buyRequest.createdByUserId, count + 1);
    }

    return {
      total: this.activeBuyRequests.size,
      byUser: Object.fromEntries(byUser),
      ids: Array.from(this.activeBuyRequests.keys()),
    };
  }
}
