import { IS_DEV, env } from "./env";

// Local environment booleans
export const IS_PROD = env.NODE_ENV === "production";
export const IS_TEST = env.NODE_ENV === "test";

// Re-export commonly used constants
export const SERVER_PORT = env.SERVER_PORT;
export const DATABASE_URL = env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/postgres?schema=public";
export const IS_GENERATING_CLIENT = env.IS_GENERATING_CLIENT;
export const BACKEND_LOG_LEVEL = env.BACKEND_LOG_LEVEL;

// Better Auth exports
export const BETTER_AUTH_SECRET = env.BETTER_AUTH_SECRET;
export const BETTER_AUTH_URL = env.BETTER_AUTH_URL;
export const FRONTEND_URL = env.FRONTEND_URL;

// Re-export convenience booleans
export { IS_DEV };
