import { createLogger } from "@repo/api-core";
import { env } from "../env";

export const logger = createLogger({
  name: "lis-parser",
  level: env.NODE_ENV === "development" ? "debug" : "info",
  environment: env.NODE_ENV,
});
