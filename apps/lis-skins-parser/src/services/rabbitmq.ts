import { EXCHANGES, QUEUES, ROUTING_KEYS, type FoundItemMessage, type BuyRequestMessage, type BuyResponseMessage } from "@repo/api-core";
import amqp from "amqplib";
import { env } from "../env";
import { logger } from "../utils/logger";

class RabbitMQService {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Declare exchanges and queues
      await this.channel.assertExchange(EXCHANGES.ITEMS_FOUND, "direct", { durable: true });
      await this.channel.assertExchange(EXCHANGES.BUY_REQUESTS, "direct", { durable: true });
      
      await this.channel.assertQueue(QUEUES.TELEGRAM_NOTIFICATIONS, { durable: true });
      await this.channel.assertQueue(QUEUES.BUY_REQUESTS, { durable: true });
      await this.channel.assertQueue(QUEUES.BUY_RESPONSES, { durable: true });

      // Bind queues to exchanges
      await this.channel.bindQueue(QUEUES.TELEGRAM_NOTIFICATIONS, EXCHANGES.ITEMS_FOUND, ROUTING_KEYS.ITEM_FOUND);
      await this.channel.bindQueue(QUEUES.BUY_REQUESTS, EXCHANGES.BUY_REQUESTS, ROUTING_KEYS.BUY_REQUEST);

      logger.info("RabbitMQ connected successfully");
    } catch (error) {
      logger.withError(error).error("Failed to connect to RabbitMQ");
      throw error;
    }
  }

  async publishFoundItem(message: FoundItemMessage): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));

    await this.channel.publish(EXCHANGES.ITEMS_FOUND, ROUTING_KEYS.ITEM_FOUND, messageBuffer, { persistent: true });

    logger
      .withContext({ buyRequestId: message.buyRequestId, platform: message.platform })
      .info("Published found item message");
  }

  async publishBuyResponse(message: BuyResponseMessage): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));

    await this.channel.publish(EXCHANGES.BUY_REQUESTS, ROUTING_KEYS.BUY_RESPONSE, messageBuffer, { persistent: true });

    logger
      .withContext({ buyRequestId: message.buyRequestId, success: message.success })
      .info("Published buy response message");
  }

  async startConsumingBuyRequests(handler: (message: BuyRequestMessage) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    await this.channel.prefetch(1);

    await this.channel.consume(QUEUES.BUY_REQUESTS, async (msg) => {
      if (!msg) return;

      try {
        const message: BuyRequestMessage = JSON.parse(msg.content.toString());
        await handler(message);
        this.channel!.ack(msg);
      } catch (error) {
        logger.withError(error).error("Error processing buy request message");
        this.channel!.nack(msg, false, true);
      }
    });

    logger.info("Started consuming buy request messages");
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}

export const rabbitmqService = new RabbitMQService();
