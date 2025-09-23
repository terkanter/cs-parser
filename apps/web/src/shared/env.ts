import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `PUBLIC_`.
   */
  client: {
    // API base URL (Backend HTTP server)
    VITE_API_URL: z.string().url().default("http://localhost:3080"),
    // Auth base URL (Better Auth handler). If not set, fallback to VITE_API_URL
    VITE_AUTH_URL: z.string().url().optional(),
    // Admin base path (mount point of the Admin UI)
    VITE_ADMIN_BASE_PATH: z.string().default("/"),
    // Feature flags / toggles
    VITE_ENABLE_FAKE_DATA: z.boolean().default(false),
    // Observability / analytics (optional)
    VITE_SENTRY_DSN: z.string().url().optional(),
    VITE_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  },

  /**
   * Client prefix for Vite
   */
  clientPrefix: "VITE_",

  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   * For Vite, we use `import.meta.env` instead of `process.env`
   */
  runtimeEnv: {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_AUTH_URL: import.meta.env.VITE_AUTH_URL,
    VITE_ADMIN_BASE_PATH: import.meta.env.VITE_ADMIN_BASE_PATH,
    VITE_ENABLE_FAKE_DATA: import.meta.env.VITE_ENABLE_FAKE_DATA,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL,
  },

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a URL, you'll get a type error.
   *
   * If you want to skip validation for one reason or another, you can
   * use the `skipValidation` option.
   *
   * This is especially useful for Docker builds, where you don't want to
   * validate the environment variables at build time, but rather at runtime.
   */
  skipValidation: !!import.meta.env.SKIP_ENV_VALIDATION,

  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

export const appConfig = {
  api: {
    url: env.VITE_API_URL,
    authUrl: env.VITE_AUTH_URL ?? env.VITE_API_URL,
  },
  admin: {
    basePath: env.VITE_ADMIN_BASE_PATH,
  },
  flags: {
    useFakeData: env.VITE_ENABLE_FAKE_DATA === "true",
  },
  observability: {
    sentryDsn: env.VITE_SENTRY_DSN,
    logLevel: env.VITE_LOG_LEVEL,
  },
} as const;
