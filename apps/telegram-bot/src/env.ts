import { config } from "@dotenvx/dotenvx";
import { z } from "zod";

config({
  quiet: true,
});

const patchedEnv = {
  ...process.env,
};

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  RABBITMQ_URL: z.string().url().default("amqp://localhost:5672"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  WEBHOOK_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),
});

export const env = envSchema.parse(patchedEnv);
