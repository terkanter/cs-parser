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
  RABBITMQ_URL: z.string().url().default("amqp://localhost:5672"),
  PARSER_INTERVAL_MS: z.coerce.number().default(30000), // 30 seconds
  MAX_CONCURRENT_PARSERS: z.coerce.number().default(5),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(patchedEnv);
