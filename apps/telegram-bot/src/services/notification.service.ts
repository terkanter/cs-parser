import { EXCHANGES, type FoundItemMessage, QUEUES, ROUTING_KEYS } from "@repo/api-core";
import { telegramBot } from "../bot/bot";
import { logger } from "../utils/logger";
import { rabbitmqConsumer } from "./rabbitmq";

class NotificationService {
  async startListening(): Promise<void> {
    await rabbitmqConsumer.setupExchangeBinding(
      EXCHANGES.ITEMS_FOUND,
      QUEUES.TELEGRAM_NOTIFICATIONS,
      ROUTING_KEYS.ITEM_FOUND,
    );

    await rabbitmqConsumer.startConsuming<FoundItemMessage>(
      QUEUES.TELEGRAM_NOTIFICATIONS,
      this.handleFoundItemMessage.bind(this),
    );

    logger.info("Notification service started listening for messages");
  }

  private async handleFoundItemMessage(message: FoundItemMessage): Promise<void> {
    try {
      logger.withContext({ buyRequestId: message.buyRequestId }).info("Received found item message");

      await telegramBot.sendFoundItemNotification(message.userId, message);

      logger.withContext({ buyRequestId: message.buyRequestId }).info("Processed notification message");
    } catch (error) {
      logger.withError(error).error("Error handling found item message");
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
