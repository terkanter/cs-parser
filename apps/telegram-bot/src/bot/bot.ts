import { prisma } from "@repo/prisma";
import { Bot, type Context, type SessionFlavor, session } from "grammy";
import { env } from "../env";
import type { FoundItemMessage } from "@repo/api-core";
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

  private setupCommands() {
    // Start command
    this.bot.command("start", async (ctx) => {
      const telegramId = ctx.from?.id.toString();
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
      const telegramId = ctx.from?.id.toString();
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
          "🔗 Для привязки аккаунта:\n\n" +
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
      const telegramId = ctx.from?.id.toString();
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
      const telegramId = ctx.from?.id.toString();
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

    // Handle unknown messages
    this.bot.on("message", async (ctx) => {
      await ctx.reply("🤔 Не понимаю эту команду.\n" + "Используйте /help для списка доступных команд.");
    });
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
        `📦 ${item.name}\n` +
        `💰 Цена: ${item.price}₽\n` +
        `🎨 Float: ${item.float}\n` +
        `🎲 Paint Seed: ${item.paintSeed}\n` +
        `⭐ Качество: ${item.quality}\n` +
        `🏪 Площадка: ${message.platform}\n\n` +
        `🔗 Холд: ${item.unlockAt}`;

      await this.bot.api.sendMessage(user.telegramId, text, {
        // parse_mode: "markdown",
        // disable_web_page_preview: true,
      });

      logger.info(`Sent notification to user ${userId}`);
    } catch (error) {
      logger.withError(error).error("Error sending notification");
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
