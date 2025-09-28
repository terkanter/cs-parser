import { telegramBot } from "./bot/bot";
import { env } from "./env";
import { connectDatabase, disconnectDatabase } from "./services/database";
import { notificationService } from "./services/notification.service";
import { rabbitmqConsumer } from "./services/rabbitmq";
import { rabbitmqProducer } from "./services/rabbitmq-producer";
import { logger } from "./utils/logger";

async function main() {
  logger.withContext({ environment: env.NODE_ENV }).info("Starting Telegram Bot Service...");

  try {
    await connectDatabase();
    await rabbitmqConsumer.connect();
    await rabbitmqProducer.connect();

    telegramBot.start();

    await notificationService.startListening();

    logger.info("Telegram Bot Service started successfully");

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.withError(error).error("Failed to start Telegram Bot Service");
    process.exit(1);
  }
}

async function shutdown() {
  logger.withContext({ environment: env.NODE_ENV }).info("Shutting down Telegram Bot Service...");

  try {
    await telegramBot.stop();
    await rabbitmqConsumer.close();
    await rabbitmqProducer.close();
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
