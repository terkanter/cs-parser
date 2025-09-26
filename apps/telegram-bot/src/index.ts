import { connectDatabase, disconnectDatabase } from "./services/database";
import { rabbitmqConsumer, type FoundItemMessage } from "./services/rabbitmq";
import { telegramBot } from "./bot/bot";
import { env } from "./env";
import { logger } from "./utils/logger";

async function main() {
  logger.info({ environment: env.NODE_ENV }, "Starting Telegram Bot Service...");

  try {
    // Connect to services
    await connectDatabase();
    await rabbitmqConsumer.connect();

    // Start Telegram bot
    await telegramBot.start();

    // Start consuming RabbitMQ messages
    await rabbitmqConsumer.startConsuming(handleFoundItemMessage);

    logger.info("Telegram Bot Service started successfully");

    // Handle graceful shutdown
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error(error, "Failed to start Telegram Bot Service");
    process.exit(1);
  }
}

async function handleFoundItemMessage(message: FoundItemMessage): Promise<void> {
  try {
    logger.info({ buyRequestId: message.buyRequestId }, "Received found item message");

    // Send notification to user
    await telegramBot.sendFoundItemNotification(message.userId, message);
  } catch (error) {
    logger.error(error, "Error handling found item message");
    throw error; // Re-throw to trigger message requeue
  }
}

async function shutdown() {
  logger.info("Shutting down Telegram Bot Service...");

  try {
    await telegramBot.stop();
    await rabbitmqConsumer.close();
    await disconnectDatabase();

    logger.info("Telegram Bot Service shut down gracefully");
    process.exit(0);
  } catch (error) {
    logger.error(error, "Error during shutdown");
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error(error, "Unhandled error");
  process.exit(1);
});
