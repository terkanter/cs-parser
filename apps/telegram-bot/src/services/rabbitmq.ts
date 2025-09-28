import amqp from "amqplib";
import { env } from "../env";
import { logger } from "../utils/logger";

class RabbitMQConsumer {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      logger.info("RabbitMQ consumer connected successfully");
    } catch (error) {
      logger.withError(error).error("Failed to connect to RabbitMQ");
      throw error;
    }
  }

  async setupExchangeBinding(
    exchangeName: string,
    queueName: string,
    routingKey: string,
    exchangeType: string = "direct"
  ): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    await this.channel.assertExchange(exchangeName, exchangeType, { durable: true });
    await this.channel.assertQueue(queueName, { durable: true });

    await this.channel.bindQueue(queueName, exchangeName, routingKey);

    logger.info(`Set up binding: exchange=${exchangeName}, queue=${queueName}, routingKey=${routingKey}`);
  }

  async startConsuming<T>(
    queueName: string,
    messageHandler: (message: T) => Promise<void>,
    options: { prefetch?: number } = {}
  ): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    const { prefetch = 1 } = options;

    await this.channel.prefetch(prefetch);

    await this.channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const message: T = JSON.parse(msg.content.toString());
        await messageHandler(message);

        this.channel!.ack(msg);
        logger.debug("Processed message successfully");
      } catch (error) {
        logger.withError(error).error("Error processing message");

        this.channel!.nack(msg, false, true);
      }
    });

    logger.info(`Started consuming messages from queue: ${queueName}`);
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
