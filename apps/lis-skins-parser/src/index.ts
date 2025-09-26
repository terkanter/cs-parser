import { connectDatabase, disconnectDatabase } from "./services/database";
import { rabbitmqService } from "./services/rabbitmq";
import { parserScheduler } from "./services/parser-scheduler";
import { env } from "./env";
import { logger } from "./utils/logger";

async function main() {
  logger.info({ environment: env.NODE_ENV }, "Starting LIS Skins Parser...");

  try {
    // Connect to services
    await connectDatabase();
    await rabbitmqService.connect();

    // Start parser scheduler
    await parserScheduler.start();

    logger.info("LIS Skins Parser started successfully");

    // Handle graceful shutdown
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error(error, "Failed to start LIS Skins Parser");
    process.exit(1);
  }
}

async function shutdown() {
  logger.info("Shutting down LIS Skins Parser...");

  try {
    await parserScheduler.stop();
    await rabbitmqService.close();
    await disconnectDatabase();

    logger.info("LIS Skins Parser shut down gracefully");
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
