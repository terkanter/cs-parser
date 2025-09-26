import { config } from "@dotenvx/dotenvx";
import { parseEnv } from "znv";
import { z } from "zod";

config({
  quiet: true,
});

const patchedEnv = {
  ...process.env,
};

export const env = parseEnv(patchedEnv, {
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SERVER_PORT: z.number().int().min(1).max(65535).default(3080),
  BACKEND_LOG_LEVEL: z.string().default("debug"),

  // Database
  DATABASE_URL: z.string().url(),

  // Better Auth configuration
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .default("change-this-secret-in-production-it-must-be-at-least-32-characters-long"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3080"),
  FRONTEND_URL: z.string().url().optional(),

  // Build configuration
  IS_GENERATING_CLIENT: z.boolean().default(false),
});

// Convenience exports
export const IS_PROD = env.NODE_ENV === "production";
export const IS_TEST = env.NODE_ENV === "test";
export const IS_DEV = env.NODE_ENV === "development";
