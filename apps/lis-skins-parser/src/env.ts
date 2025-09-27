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
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(patchedEnv);
