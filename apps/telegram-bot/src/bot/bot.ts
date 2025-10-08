import { createHash } from "node:crypto";
import type { BuyResponseMessage, FoundItemMessage } from "@repo/api-core";
import { prisma } from "@repo/prisma";
import { Bot, type Context, InlineKeyboard, type SessionFlavor, session } from "grammy";
import { env } from "../env";
import { rabbitmqProducer } from "../services/rabbitmq-producer";
import { logger } from "../utils/logger";

interface SessionData {
  step?: string;
}

type BotContext = Context & SessionFlavor<SessionData>;

export class TelegramBot {
  private bot: Bot<BotContext>;

  constructor() {
    this.bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);
    this.setupMiddleware();
    this.setupCommands();
  }

  private setupMiddleware() {
    // Session middleware
    this.bot.use(
      session({
        initial: (): SessionData => ({}),
      }),
    );
  }

  private getTelegramId(ctx: Context): string | undefined {
    const telegramChatId = ctx.chat?.id.toString();
    const telegramUserId = ctx.from?.id.toString();
    return telegramChatId || telegramUserId;
  }

  private async storeCallbackData(data: {
    buyRequestId: string;
    platform: string;
    itemId: number;
    price: number;
  }): Promise<string> {
    const hash = createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 8);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    await prisma.telegramCallbackData.create({
      data: {
        id: hash,
        data: data,
        expiresAt,
      },
    });

    return hash;
  }

  private async getCallbackData(id: string): Promise<{
    buyRequestId: string;
    platform: string;
    itemId: number;
    price: number;
  } | null> {
    const record = await prisma.telegramCallbackData.findUnique({
      where: { id },
    });

    if (!record || record.expiresAt < new Date()) {
      if (record) {
        await prisma.telegramCallbackData.delete({
          where: { id },
        });
      }
      return null;
    }

    return record.data as {
      buyRequestId: string;
      platform: string;
      itemId: number;
      price: number;
    };
  }

  private setupCommands() {
    // Start command
    this.bot.command("start", async (ctx) => {
      const telegramId = this.getTelegramId(ctx);
      if (!telegramId) return;

      await ctx.reply(
        "Привет! 👋\n\n" +
          "Я бот для уведомлений о найденных предметах CS2.\n\n" +
          "Команды:\n" +
          "/link - Привязать аккаунт\n" +
          "/unlink - Отвязать аккаунт\n" +
          "/status - Проверить статус\n" +
          "/help - Помощь",
      );
    });

    // Link account command
    this.bot.command("link", async (ctx) => {
      const telegramId = this.getTelegramId(ctx);

      if (!telegramId) return;

      try {
        // Check if user already linked
        const existingUser = await prisma.user.findFirst({
          where: { telegramId },
        });

        if (existingUser) {
          await ctx.reply("✅ Ваш аккаунт уже привязан!");
          return;
        }

        await ctx.reply(
          `🔗 Для привязки аккаунта:\n\n` +
            "1. Зайдите в веб-приложение\n" +
            "2. Перейдите в настройки профиля\n" +
            "3. Введите ваш Telegram ID: `" +
            telegramId +
            "`\n" +
            "4. Сохраните изменения\n\n" +
            "После этого вы будете получать уведомления!",
          { parse_mode: "Markdown" },
        );
      } catch (error) {
        logger.withError(error).error("Error in link command");
        await ctx.reply("❌ Произошла ошибка. Попробуйте позже.");
      }
    });

    // Unlink account command
    this.bot.command("unlink", async (ctx) => {
      const telegramId = this.getTelegramId(ctx);

      if (!telegramId) return;

      try {
        const user = await prisma.user.findFirst({
          where: { telegramId },
        });

        if (!user) {
          await ctx.reply("❌ Ваш аккаунт не привязан.");
          return;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { telegramId: null },
        });

        await ctx.reply("✅ Аккаунт успешно отвязан!");
      } catch (error) {
        logger.withError(error).error("Error in unlink command");
        await ctx.reply("❌ Произошла ошибка. Попробуйте позже.");
      }
    });

    // Status command
    this.bot.command("status", async (ctx) => {
      const telegramId = this.getTelegramId(ctx);

      if (!telegramId) return;

      try {
        const user = await prisma.user.findFirst({
          where: { telegramId },
        });

        if (!user) {
          await ctx.reply("❌ Аккаунт не привязан. Используйте /link для привязки.");
          return;
        }

        await ctx.reply(
          `✅ Аккаунт привязан!\n\n` +
            `👤 Имя: ${user.name}\n` +
            `📧 Email: ${user.email}\n` +
            `🆔 Telegram ID: ${telegramId}`,
        );
      } catch (error) {
        logger.withError(error).error("Error in status command");
        await ctx.reply("❌ Произошла ошибка. Попробуйте позже.");
      }
    });

    // Help command
    this.bot.command("help", async (ctx) => {
      await ctx.reply(
        "🤖 Помощь по боту\n\n" +
          "Команды:\n" +
          "/start - Начать работу с ботом\n" +
          "/link - Привязать ваш аккаунт\n" +
          "/unlink - Отвязать аккаунт\n" +
          "/status - Проверить статус привязки\n" +
          "/help - Показать эту справку\n\n" +
          "Бот отправляет уведомления когда найдены предметы, соответствующие вашим заявкам на покупку.",
      );
    });

    // Handle callback queries (inline keyboard buttons)
    this.bot.on("callback_query", async (ctx) => {
      const data = ctx.callbackQuery.data;

      if (data?.startsWith("buy_")) {
        await this.handleBuyRequest(ctx, data);
      } else {
        await ctx.answerCallbackQuery("Неизвестная команда");
      }
    });

    // Handle unknown messages
    this.bot.on("message", async (ctx) => {
      await ctx.reply("🤔 Не понимаю эту команду.\n" + "Используйте /help для списка доступных команд.");
    });
  }

  private async handleBuyRequest(ctx: any, callbackData: string): Promise<void> {
    try {
      // Parse callback data: "buy_{shortId}"
      const parts = callbackData.split("_");
      if (parts.length !== 2) {
        await ctx.answerCallbackQuery("❌ Некорректные данные");
        return;
      }

      const [, shortId] = parts;
      
      // Get full data from storage
      const data = await this.getCallbackData(shortId);
      if (!data) {
        await ctx.answerCallbackQuery("❌ Данные устарели, попробуйте найти предмет заново");
        return;
      }

      const telegramId = this.getTelegramId(ctx);

      if (!telegramId) {
        await ctx.answerCallbackQuery("❌ Ошибка идентификации");
        return;
      }

      // Find user by telegram ID
      const user = await prisma.user.findFirst({
        where: { telegramId },
      });

      if (!user) {
        await ctx.answerCallbackQuery("❌ Аккаунт не привязан");
        return;
      }

      // Send buy request message to RabbitMQ
      await rabbitmqProducer.publishBuyRequest({
        buyRequestId: data.buyRequestId,
        userId: user.id,
        platform: data.platform,
        id: data.itemId,
        price: data.price,
        telegramMessageId: ctx.callbackQuery.message?.message_id,
        telegramChatId: this.getTelegramId(ctx)!,
      });

      await ctx.answerCallbackQuery("🔄 Обрабатываем покупку...");

      logger.withContext({ 
        buyRequestId: data.buyRequestId, 
        userId: user.id, 
        platform: data.platform 
      }).info("Sent buy request to queue");
    } catch (error) {
      logger.withError(error).error("Error handling buy request");
      await ctx.answerCallbackQuery("❌ Произошла ошибка");
    }
  }

  async sendFoundItemNotification(userId: string, message: FoundItemMessage): Promise<void> {
    logger.withContext({ userId });

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.telegramId) {
        logger.warn(`User ${userId} has no Telegram ID`);
        return;
      }

      const { item } = message;
      const text =
        `🎯 Найден предмет!\n\n` +
        `🎲 Paint Seed: ${item.paintSeed}${item.paintSeedTier ? ` Tier: ${item.paintSeedTier}` : ""}\n\n` +
        `📦 ${item.name}\n` +
        `💰 Цена: ${item.price}$\n` +
        `🎨 Float: ${item.float}\n` +
        `${item.quality ? `⭐ Качество: ${item.quality}\n` : ""}` +
        `🔗 Холд: ${item.unlockAt ? new Date(item.unlockAt).toLocaleString() : "Нет"}\n\n` +
        `🔗 Платформа ${message.platform}`;

      const shortId = await this.storeCallbackData({
        buyRequestId: message.buyRequestId,
        platform: message.platform,
        itemId: message.item.id,
        price: item.price,
      });

      const keyboard = new InlineKeyboard().text(
        "🛒 Купить",
        `buy_${shortId}`,
      );

      await this.bot.api.sendMessage(user.telegramId, text, {
        reply_markup: keyboard,
        // parse_mode: "markdown",
        // disable_web_page_preview: true,
      });

      logger.info(`Sent notification to user ${userId}`);
    } catch (error) {
      logger.withError(error).error("Error sending notification");
    }
  }

  async sendBuyResponseNotification(message: BuyResponseMessage): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: message.userId },
      });

      if (!user || !user.telegramId) {
        logger.warn(`User ${message.userId} has no Telegram ID`);
        return;
      }

      const emoji = message.success ? "✅" : "❌";
      const title = message.success ? "Покупка успешна!" : "Ошибка покупки";
      const text = `${emoji} ${title}\n\n${message.message}`;

      // If we have original message info, try to edit it
      if (message.telegramChatId && message.telegramMessageId) {
        try {
          await this.bot.api.editMessageText(message.telegramChatId, message.telegramMessageId, text);
        } catch (editError) {
          // If edit fails, send new message
          logger.withContext({ error: editError }).warn("Failed to edit message, sending new one");
          await this.bot.api.sendMessage(user.telegramId, text);
        }
      } else {
        // Send new message
        await this.bot.api.sendMessage(user.telegramId, text);
      }

      logger
        .withContext({
          userId: message.userId,
          success: message.success,
        })
        .info("Sent buy response notification");
    } catch (error) {
      logger.withError(error).error("Error sending buy response notification");
    }
  }

  async start(): Promise<void> {
    logger.info("Starting Telegram bot...");

    this.bot.start();
  }

  async stop(): Promise<void> {
    logger.info("Stopping Telegram bot...");
    await this.bot.stop();
  }

  getBotInstance(): Bot<BotContext> {
    return this.bot;
  }
}

export const telegramBot = new TelegramBot();
