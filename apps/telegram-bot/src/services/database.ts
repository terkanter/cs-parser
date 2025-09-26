import { prisma } from "@repo/prisma";
import { logger } from "../utils/logger";

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error(error, "Failed to connect to database");
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
