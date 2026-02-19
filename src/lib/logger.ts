import pino from 'pino';
import path from 'path';
import { config } from '../config';

// Configure logger with file output for all logs
const transport = pino.transport({
  targets: [
    // Console output with pretty printing (development)
    ...(config.nodeEnv === 'development'
      ? [
        {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      ]
      : []),
    // File output for all logs (Loki/Promtail ingestion + local backup)
    {
      target: 'pino/file',
      options: {
        destination: path.join(process.cwd(), 'logs', 'app.log'),
        mkdir: true,
      },
    },
  ],
});

export const logger = pino(
  {
    level: config.nodeEnv === 'development' ? 'debug' : 'info',
    base: {
      environment: config.nodeEnv,
      service: 'execora-api',
      version: '1.0.0',
    },
  },
  transport
);
