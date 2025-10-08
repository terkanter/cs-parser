import type { BuyRequest } from "@repo/prisma";
import { LIS_SKINS_API_URL, LIS_SKINS_WEBSOCKET_URL } from "../../consts";
import type { BuyRequestRepository, PlatformAccountRepository, UserRepository } from "../../repositories";
import { logger } from "../../utils/logger";
import { rabbitmqService } from "../rabbitmq";

import { BuyRequestManager } from "./buy-request-manager";
import { LisSkinsConnectionService } from "./connection-service";
import type { FoundItemMessage } from "./message-handler";
import { LisSkinsMessageHandler } from "./message-handler";
import { LisSkinsTokenManager } from "./token-manager";
import { LisSkinsTradeService } from "./trade-service";

export interface LisSkinsServiceConfig {
  websocketUrl?: string;
  apiUrl?: string;
  channel?: string;
  updateInterval?: number;
  healthCheckInterval?: number;
  tokenRefreshInterval?: number;
}

export class LisSkinsService {
  private tokenManager: LisSkinsTokenManager;
  private buyRequestManager: BuyRequestManager;
  private messageHandler: LisSkinsMessageHandler;
  private connectionService: LisSkinsConnectionService;
  private tradeService: LisSkinsTradeService;
  private isRunning = false;

  constructor(
    private buyRequestRepository: BuyRequestRepository,
    private platformAccountRepository: PlatformAccountRepository,
    private userRepository: UserRepository,
    private config: LisSkinsServiceConfig = {},
  ) {
    // Initialize token manager
    this.tokenManager = new LisSkinsTokenManager(platformAccountRepository, this.getWebSocketToken.bind(this), {
      tokenRefreshInterval: config.tokenRefreshInterval,
    });

    // Initialize buy request manager
    this.buyRequestManager = new BuyRequestManager(buyRequestRepository);

    // Initialize message handler
    this.messageHandler = new LisSkinsMessageHandler(this.onItemFound.bind(this));

    // Initialize connection service
    this.connectionService = new LisSkinsConnectionService(
      {
        websocketUrl: config.websocketUrl ?? LIS_SKINS_WEBSOCKET_URL,
        channel: config.channel ?? "public:obtained-skins",
        updateInterval: config.updateInterval ?? 30000, // 30 seconds
        healthCheckInterval: config.healthCheckInterval ?? 60000, // 1 minute
      },
      this.tokenManager,
      this.buyRequestManager,
      this.messageHandler,
    );

    // Initialize trade service
    this.tradeService = new LisSkinsTradeService(platformAccountRepository, userRepository);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info("LIS-Skins service is already running");
      return;
    }

    logger.info("Starting LIS-Skins service...");
    this.isRunning = true;

    try {
      await this.connectionService.start();
    } catch (error) {
      logger.withError(error).error("Failed to start LIS-Skins service");
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info("Stopping LIS-Skins service...");
    this.isRunning = false;

    await this.connectionService.stop();
    await rabbitmqService.close();
  }

  async addBuyRequest(buyRequest: BuyRequest): Promise<void> {
    await this.connectionService.addBuyRequest(buyRequest);
  }

  async removeBuyRequest(buyRequestId: string): Promise<void> {
    await this.connectionService.removeBuyRequest(buyRequestId);
  }

  async buyItem(userId: string, id: number, price: number) {
    return this.tradeService.buyItem(userId, id, price);
  }

  async checkBalance(userId: string): Promise<number | null> {
    return this.tradeService.checkBalance(userId);
  }

  getMetrics() {
    return {
      isRunning: this.isRunning,
      connection: this.connectionService.getMetrics(),
    };
  }

  private async onItemFound(message: FoundItemMessage): Promise<void> {
    try {
      await rabbitmqService.publishFoundItem(message);

      logger
        .withContext({
          buyRequestId: message.buyRequestId,
          itemName: message.item.name,
          price: message.item.price,
        })
        .info("Published found item to RabbitMQ");
    } catch (error) {
      logger.withError(error).error("Failed to publish found item");
    }
  }

  private async getWebSocketToken(apiKey: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.apiUrl ?? LIS_SKINS_API_URL}user/get-ws-token`, {
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
}
