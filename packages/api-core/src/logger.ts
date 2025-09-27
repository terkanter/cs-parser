import { PinoTransport } from "@loglayer/transport-pino";
import { getPrettyTerminal } from "@loglayer/transport-pretty-terminal";
import { LogLayer, type LogLayerTransport, type PluginShouldSendToLoggerParams } from "loglayer";
import { pino } from "pino";
import { serializeError } from "serialize-error";

// Common ignored logs - can be overridden by applications
const defaultIgnoreLogs = ["request completed", "incoming request"];

export interface LoggerConfig {
  name?: string;
  level?: string;
  ignoreLogs?: string[];
  disableLogging?: boolean;
  environment?: "production" | "development" | "test";
}

export function createLogger(config: LoggerConfig = {}) {
  const {
    name = "app",
    level = "info",
    ignoreLogs = defaultIgnoreLogs,
    disableLogging = false,
    environment = "development",
  } = config;

  const transports: LogLayerTransport[] = [];

  if (environment === "production") {
    transports.push(
      new PinoTransport({
        logger: pino({
          level,
        }),
      }),
    );
  } else if (environment === "test") {
    transports.push(
      getPrettyTerminal({
        disableInteractiveMode: true,
      }),
    );
  } else {
    transports.push(
      getPrettyTerminal({
        disableInteractiveMode: true,
      }),
    );
  }

  const logger = new LogLayer({
    prefix: `[${name}]`,
    transport: transports,
    contextFieldName: "context",
    metadataFieldName: "metadata",
    errorFieldName: "err",
    errorSerializer: serializeError,
    copyMsgOnOnlyError: true,
    plugins: [
      {
        shouldSendToLogger(params: PluginShouldSendToLoggerParams): boolean {
          if (
            params.messages?.[1] &&
            typeof params.messages[1] === "string" &&
            ignoreLogs.some((log) => params.messages[1].includes(log))
          ) {
            return false;
          }
          return true;
        },
      },
    ],
  });

  if (environment === "test" || disableLogging) {
    logger.disableLogging();
  }

  return logger;
}
