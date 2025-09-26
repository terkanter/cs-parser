import { EXCHANGES, QUEUES, ROUTING_KEYS } from "@repo/api-core";
import amqp from "amqplib";
import { env } from "../env";
import { logger } from "../utils/logger";

export interface FoundItemMessage {
  buyRequestId: string;
  userId: string;
  platform: string;
  item: {
    name: string;
    price: number;
    float: number;
    paintSeed: number;
    quality: string;
    url: string;
    imageUrl?: string;
  };
  foundAt: Date;
}

class RabbitMQService {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Declare exchanges and queues
      await this.channel.assertExchange(EXCHANGES.ITEMS_FOUND, "direct", { durable: true });
      await this.channel.assertQueue(QUEUES.TELEGRAM_NOTIFICATIONS, { durable: true });

      // Bind queue to exchange
      await this.channel.bindQueue(QUEUES.TELEGRAM_NOTIFICATIONS, EXCHANGES.ITEMS_FOUND, ROUTING_KEYS.ITEM_FOUND);

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
