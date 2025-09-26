import type { BuyRequestQuery } from "@repo/api-core";
import { type BuyRequest, prisma } from "@repo/prisma";
import { env } from "../env";
import { lisSkinsParser } from "../parsers/lis-skins";
import { logger } from "../utils/logger";
import { rabbitmqService } from "./rabbitmq";

class ParserScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Parser scheduler is already running");
      return;
    }

    logger.info("Starting parser scheduler...");
    this.isRunning = true;

    // Run immediately
    await this.runParsingCycle();

    // Schedule recurring runs
    this.intervalId = setInterval(async () => {
      await this.runParsingCycle();
    }, env.PARSER_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info("Stopping parser scheduler...");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runParsingCycle(): Promise<void> {
    try {
      logger.info("Starting parsing cycle...");

      // Get active LIS_SKINS buy requests
      const buyRequests = await prisma.buyRequest.findMany({
        where: {
          isActive: true,
          platform: "LIS_SKINS",
        },
        include: {
          // TODO: Add user relation when we add userId to BuyRequest
        },
      });

      logger.info(`Found ${buyRequests.length} active LIS Skins buy requests`);

      // Process each buy request
      for (const buyRequest of buyRequests) {
        try {
          await this.processBuyRequest(buyRequest);
        } catch (error) {
          logger.withError(error).error(`Error processing buy request ${buyRequest.id}`);
        }
      }

      logger.info("Parsing cycle completed");
    } catch (error) {
      logger.withError(error).error("Error in parsing cycle");
    }
  }

  private async processBuyRequest(buyRequest: BuyRequest): Promise<void> {
    logger.withContext({ buyRequestId: buyRequest.id }).debug("Processing buy request");

    // Parse the query JSON
    const query = buyRequest.query as BuyRequestQuery;

    // Parse items from LIS Skins
    const foundItems = await lisSkinsParser.parseItems(query);

    // Send notifications for found items
    for (const item of foundItems) {
      await rabbitmqService.publishFoundItem({
        buyRequestId: buyRequest.id,
        userId: "", // TODO: Add userId from buyRequest relation
        platform: "LIS_SKINS",
        item,
        foundAt: new Date(),
      });

      logger
        .withContext({ buyRequestId: buyRequest.id, itemName: item.name, price: item.price })
        .info(`Found matching item: ${item.name} - ${item.price}₽`);
    }
  }
}

export const parserScheduler = new ParserScheduler();
