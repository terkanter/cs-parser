import { BACKEND_LOG_LEVEL, IS_TEST } from "@/constants";
import { env } from "@/env";
import { asyncLocalStorage } from "@/utils/async-local-storage";
import { createLogger } from "@repo/api-core";
import type { ILogLayer } from "loglayer";

declare module "fastify" {
  interface FastifyBaseLogger extends ILogLayer {}
}

// API-specific ignored logs
const apiIgnoreLogs = ["request completed", "incoming request"];

const logger = createLogger({
  name: "api",
  level: BACKEND_LOG_LEVEL,
  ignoreLogs: apiIgnoreLogs,
  environment: env.NODE_ENV,
  disableLogging: IS_TEST,
});

export function getLogger(): ILogLayer {
  if (IS_TEST) {
    return logger;
  }

  const store = asyncLocalStorage.getStore();

  if (!store) {
    // Use non-request specific logger
    return logger;
  }

  return store.logger;
}
