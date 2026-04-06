import pino from "pino";
import path from "path";
import { config } from "./config";

// Detect test environment
const isTest =
  process.env.NODE_TEST === "1" || process.env.NODE_TEST === "true";

// Configure logger targets
// - development : pino-pretty to console + file
// - production  : JSON to stdout (Docker/K8s captures fd 1) + file for Loki/Promtail
// - test        : no transport (avoids pino flush timeout in Jest)
const transport = pino.transport({
  targets: [
    // Development: human-readable pretty console
    ...(config.nodeEnv === "development"
      ? [
          {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
              singleLine: false,
            },
          },
        ]
      : []),
    // Production: JSON to stdout — required for Docker/K8s log aggregation
    ...(config.nodeEnv === "production"
      ? [{ target: "pino/file", options: { destination: 1 } }]
      : []),
    // File output for Loki/Promtail ingestion (all non-test environments)
    // Uses pino-roll for daily rotation + 10-file retention to prevent disk fill
    ...(isTest
      ? []
      : [
          {
            target: "pino-roll",
            options: {
              file: path.join(process.cwd(), "logs", "app.log"),
              frequency: "daily",
              size: "50m",
              mkdir: true,
              limit: { count: 10 },
              // Symlink latest log to app.log so Promtail keeps its stable path
              symlink: true,
            },
          },
        ]),
  ],
});

export const logger = pino(
  {
    level:
      process.env.LOG_LEVEL ||
      (config.nodeEnv === "development" ? "debug" : "info"),
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password",
        "passwordHash",
        "accessToken",
        "refreshToken",
        "apiKey",
        "*.apiKey",
      ],
      remove: true,
    },
    base: {
      environment: config.nodeEnv,
      service: "execora-api",
      version: "1.0.0",
    },
  },
  transport,
);
