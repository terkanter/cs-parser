import type { BuyRequestMessage } from "@repo/api-core";
import { logger } from "../utils/logger";
import { lisSkinsService } from "./lis-skins.service";
import { rabbitmqService } from "./rabbitmq";

class BuyHandlerService {
  async startListening(): Promise<void> {
    await rabbitmqService.startConsumingBuyRequests(this.handleBuyRequest.bind(this));
    logger.info("Buy handler service started listening for buy requests");
  }

  private async handleBuyRequest(message: BuyRequestMessage): Promise<void> {
    try {
      logger
        .withContext({
          buyRequestId: message.buyRequestId,
          userId: message.userId,
          platform: message.platform,
        })
        .info("Processing buy request");

      // Execute the purchase
      const result = await lisSkinsService.buyItem(message.userId, message.id, message.price);

      // Send response back
      await rabbitmqService.publishBuyResponse({
        buyRequestId: message.buyRequestId,
        userId: message.userId,
        platform: message.platform,
        success: result.success,
        message: result.message,
        telegramMessageId: message.telegramMessageId,
        telegramChatId: message.telegramChatId,
      });

      logger
        .withContext({
          buyRequestId: message.buyRequestId,
          success: result.success,
        })
        .info("Processed buy request and sent response");
    } catch (error) {
      logger.withError(error).error("Error handling buy request");

      // Send error response
      try {
        await rabbitmqService.publishBuyResponse({
          buyRequestId: message.buyRequestId,
          userId: message.userId,
          platform: message.platform,
          success: false,
          message: "Произошла внутренняя ошибка",
          telegramMessageId: message.telegramMessageId,
          telegramChatId: message.telegramChatId,
        });
      } catch (responseError) {
        logger.withError(responseError).error("Failed to send error response");
      }
    }
  }
}

export const buyHandlerService = new BuyHandlerService();
