import { telegramBot } from "./bot/bot";
import { env } from "./env";
import { connectDatabase, disconnectDatabase } from "./services/database";
import { type FoundItemMessage, rabbitmqConsumer } from "./services/rabbitmq";
import { logger } from "./utils/logger";

async function main() {
  logger.withContext({ environment: env.NODE_ENV }).info("Starting Telegram Bot Service...");

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
    logger.withError(error).error("Failed to start Telegram Bot Service");
    process.exit(1);
  }
}

async function handleFoundItemMessage(message: FoundItemMessage): Promise<void> {
  try {
    logger.withContext({ buyRequestId: message.buyRequestId }).info("Received found item message");

    // Send notification to user
    await telegramBot.sendFoundItemNotification(message.userId, message);
  } catch (error) {
    logger.withError(error).error("Error handling found item message");
    throw error; // Re-throw to trigger message requeue
  }
}

async function shutdown() {
  logger.withContext({ environment: env.NODE_ENV }).info("Shutting down Telegram Bot Service...");

  try {
    await telegramBot.stop();
    await rabbitmqConsumer.close();
    await disconnectDatabase();

    logger.withContext({ environment: env.NODE_ENV }).info("Telegram Bot Service shut down gracefully");
    process.exit(0);
  } catch (error) {
    logger.withError(error).error("Error during shutdown");
    process.exit(1);
  }
}

main().catch((error) => {
  logger.withError(error).error("Unhandled error");
  process.exit(1);
});
