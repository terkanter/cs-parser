import type { BuyRequest } from "@repo/prisma";
import { logger } from "../../utils/logger";
import { WebSocketClient } from "../websocket";
import type { IBuyRequestManager } from "./buy-request-manager";
import type { IMessageHandler, LisSkinsWebSocketItem } from "./message-handler";
import type { ITokenManager } from "./token-manager";

export interface LisSkinsConnectionConfig {
  websocketUrl: string;
  channel: string;
  updateInterval: number;
  healthCheckInterval: number;
}

export class LisSkinsConnectionService {
  private wsClient?: WebSocketClient<LisSkinsWebSocketItem>;
  private updateInterval?: NodeJS.Timeout;
  private isRunning = false;
  private connectionStartTime = new Date();

  constructor(
    private config: LisSkinsConnectionConfig,
    private tokenManager: ITokenManager,
    private buyRequestManager: IBuyRequestManager,
    private messageHandler: IMessageHandler,
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info("LIS-Skins connection service is already running");
      return;
    }

    logger.info("Starting LIS-Skins connection service...");
    this.isRunning = true;

    try {
      // Load initial data
      const buyRequests = await this.buyRequestManager.loadActiveBuyRequests();

      if (buyRequests.length === 0) {
        logger.info("No active buy requests found, not starting connection");
        return;
      }

      // Load tokens for all users
      const userIds = this.buyRequestManager.getUserIds();
      await this.tokenManager.loadTokens(userIds);

      // Start WebSocket connection
      await this.startWebSocketConnection();

      // Start periodic updates
      this.startPeriodicUpdates();
    } catch (error) {
      logger.withError(error).error("Failed to start connection service");
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info("Stopping LIS-Skins connection service...");
    this.isRunning = false;

    // Stop periodic updates
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    // Stop WebSocket connection
    await this.stopWebSocketConnection();

    // Clear tokens
    this.tokenManager.clearTokens();
  }

  async addBuyRequest(buyRequest: BuyRequest): Promise<void> {
    this.buyRequestManager.addBuyRequest(buyRequest);

    // Load token for the user if not already loaded
    await this.tokenManager.addUser(buyRequest.createdByUserId);

    // Start connection if this is the first request
    if (!this.wsClient && this.buyRequestManager.hasBuyRequests()) {
      await this.startWebSocketConnection();
    }
  }

  async removeBuyRequest(buyRequestId: string): Promise<void> {
    this.buyRequestManager.removeBuyRequest(buyRequestId);

    // Stop connection if no more requests
    if (!this.buyRequestManager.hasBuyRequests()) {
      await this.stopWebSocketConnection();
    }
  }

  isConnected(): boolean {
    return this.wsClient?.isConnected() ?? false;
  }

  getConnectionState() {
    return this.wsClient?.getState();
  }

  getMetrics() {
    return {
      isRunning: this.isRunning,
      isConnected: this.isConnected(),
      connectionState: this.getConnectionState(),
      buyRequests: this.buyRequestManager.getMetrics(),
      tokens: this.tokenManager.getMetrics(),
      health: this.wsClient?.getHealthMetrics(),
    };
  }

  private async startWebSocketConnection(): Promise<void> {
    if (this.wsClient) {
      return;
    }

    this.connectionStartTime = new Date();
    this.messageHandler.setConnectionStartTime(this.connectionStartTime);

    this.wsClient = new WebSocketClient<LisSkinsWebSocketItem>({
      url: this.config.websocketUrl,
      channel: this.config.channel,
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
        const token = await this.tokenManager.getToken();
        if (!token) {
          throw new Error("No token available for WebSocket connection");
        }
        return token;
      },
      onMessage: async (item) => {
        const buyRequests = this.buyRequestManager.getBuyRequests();
        await this.messageHandler.handleMessage(item, buyRequests);
      },
      onOpen: () => {
        this.connectionStartTime = new Date();
        this.messageHandler.setConnectionStartTime(this.connectionStartTime);
      },
      onError: (error) => {
        logger.withError(error).error("WebSocket error in connection service");
      },
      onClose: (reason) => {
        logger.warn(`WebSocket closed in connection service: ${reason}`);
      },
      healthCheckInterval: this.config.healthCheckInterval,
    });

    await this.wsClient.connect();
    logger.info("WebSocket connection established");
  }

  private async stopWebSocketConnection(): Promise<void> {
    if (!this.wsClient) {
      return;
    }

    await this.wsClient.disconnect();
    this.wsClient.dispose();
    this.wsClient = undefined;

    logger.info("WebSocket connection stopped");
  }

  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(async () => {
      await this.updateConnections();
    }, this.config.updateInterval);
  }

  private async updateConnections(): Promise<void> {
    try {
      // Update buy requests
      const { added, removed } = await this.buyRequestManager.updateBuyRequests();

      // Update tokens for new users
      if (added.length > 0) {
        const newUserIds = added
          .map((id) => this.buyRequestManager.getBuyRequest(id)?.createdByUserId)
          .filter((id): id is string => id !== undefined);

        await this.tokenManager.loadTokens(newUserIds);
      }

      // Clean up tokens for removed users
      if (removed.length > 0) {
        const activeUserIds = this.buyRequestManager.getUserIds();
        const allUserIds = Array.from(this.tokenManager.getAllTokens().keys());
        const unusedUserIds = allUserIds.filter((id) => !activeUserIds.includes(id));

        if (unusedUserIds.length > 0) {
          this.tokenManager.clearTokens(unusedUserIds);
        }
      }

      // Handle connection state based on buy requests
      if (!this.buyRequestManager.hasBuyRequests() && this.wsClient) {
        await this.stopWebSocketConnection();
      } else if (this.buyRequestManager.hasBuyRequests() && !this.wsClient) {
        await this.startWebSocketConnection();
      }
    } catch (error) {
      logger.withError(error).error("Error updating connections");
    }
  }
}
