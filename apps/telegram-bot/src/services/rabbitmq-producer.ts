import amqp from "amqplib";
import { EXCHANGES, QUEUES, ROUTING_KEYS, type BuyRequestMessage } from "@repo/api-core";
import { env } from "../env";
import { logger } from "../utils/logger";

class RabbitMQProducer {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Setup exchanges
      await this.channel.assertExchange(EXCHANGES.BUY_REQUESTS, "direct", { durable: true });

      logger.info("RabbitMQ producer connected successfully");
    } catch (error) {
      logger.withError(error).error("Failed to connect to RabbitMQ producer");
      throw error;
    }
  }

  async publishBuyRequest(message: BuyRequestMessage): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ producer channel not initialized");
    }

    try {
      await this.channel.publish(
        EXCHANGES.BUY_REQUESTS,
        ROUTING_KEYS.BUY_REQUEST,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      logger.withContext({ buyRequestId: message.buyRequestId }).info("Published buy request message");
    } catch (error) {
      logger.withError(error).error("Failed to publish buy request message");
      throw error;
    }
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

export const rabbitmqProducer = new RabbitMQProducer();
