import { QUEUES } from "@repo/api-core";
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

class RabbitMQConsumer {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Ensure the queue exists
      await this.channel.assertQueue(QUEUES.TELEGRAM_NOTIFICATIONS, { durable: true });

      logger.info("RabbitMQ consumer connected successfully");
    } catch (error) {
      logger.withError(error).error("Failed to connect to RabbitMQ");
      throw error;
    }
  }

  async startConsuming(messageHandler: (message: FoundItemMessage) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    // Set QoS to process one message at a time
    await this.channel.prefetch(1);

    await this.channel.consume(QUEUES.TELEGRAM_NOTIFICATIONS, async (msg) => {
      if (!msg) return;

      try {
        const message: FoundItemMessage = JSON.parse(msg.content.toString());
        await messageHandler(message);

        // Acknowledge the message
        this.channel!.ack(msg);
        logger.withContext({ buyRequestId: message.buyRequestId }).info("Processed notification message");
      } catch (error) {
        logger.withError(error).error("Error processing message");

        // Reject and requeue the message
        this.channel!.nack(msg, false, true);
      }
    });

    logger.info("Started consuming RabbitMQ messages");
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

export const rabbitmqConsumer = new RabbitMQConsumer();
