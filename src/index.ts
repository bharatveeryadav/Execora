import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from './config';
import { logger } from './infrastructure/logger';
import { disconnectDB, ensureVoiceSchemaReady } from './infrastructure/database';
import { bootstrapSystem } from './infrastructure/bootstrap';
import { closeQueues } from './infrastructure/queue';
import { minioClient } from './infrastructure/storage';
import { llmCache } from './infrastructure/llm-cache';
import {
  getRuntimeConfig,
  initRuntimeConfig,
  startRuntimeConfigPolling,
  stopRuntimeConfigPolling,
} from './infrastructure/runtime-config';
import { registerRoutes } from './api';
import { websocketHandler } from './ws/handler';
import { enhancedWebsocketHandler } from './ws/enhanced-handler';
import { metricsPlugin } from './infrastructure/metrics-plugin';
import { ErrorHandler, AppError, setupGlobalErrorHandlers } from './infrastructure/error-handler';
import { emailService } from './infrastructure/email';
import { startWorkers, closeWorkers } from './infrastructure/workers';

// Choose WebSocket handler based on configuration
const useEnhancedAudio = process.env.USE_ENHANCED_AUDIO !== 'false'; // Default to enhanced
const wsHandler = useEnhancedAudio ? enhancedWebsocketHandler : websocketHandler;

// Create Fastify instance
const fastify = Fastify({
  logger: logger as any,
  trustProxy: true,
  bodyLimit: 1048576, // 1 MB for JSON — multipart has its own 100 MB limit
});

// Register plugins
async function registerPlugins() {
  const runtimeConfig = getRuntimeConfig();

  // Metrics (register first to track all requests)
  await fastify.register(metricsPlugin);

  // Security headers — CSP disabled here; tighten per frontend needs
  await fastify.register(fastifyHelmet, { contentSecurityPolicy: false });

  // Rate limiting — 200 req/min per IP globally
  // Webhook routes opt out via config.rateLimit = false at the route level
  await fastify.register(fastifyRateLimit, {
    max: runtimeConfig.ops.rateLimit.max,
    timeWindow: runtimeConfig.ops.rateLimit.timeWindow,
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
      statusCode: 429,
    }),
  });

  // CORS — restrict to configured origins in production
  const allowedOrigins = runtimeConfig.ops.allowedOrigins;

  await fastify.register(fastifyCors, {
    origin:
      config.nodeEnv === 'production' && allowedOrigins.length > 0
        ? allowedOrigins
        : true,
    credentials: true,
  });

  // WebSocket
  await fastify.register(fastifyWebsocket);

  // Multipart (file uploads)
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
  });

  // Static files (for frontend)
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/',
  });
}

// Register WebSocket route
function registerWebSocket() {
  fastify.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (connection: any, request) => {
      const wsConnection = connection?.socket ?? connection;
      wsHandler.handleConnection(wsConnection, request);
    });
  });

  logger.info({ enhanced: useEnhancedAudio }, 'WebSocket handler registered');
}

// Initialize services
async function initializeServices() {
  try {
    // Bootstrap default tenant + user (must run before any DB writes that need SYSTEM_TENANT_ID)
    await bootstrapSystem();

    if (useEnhancedAudio) {
      await ensureVoiceSchemaReady();
      logger.info('Voice schema preflight check passed');
    }

    // Initialize MinIO
    await minioClient.initialize();
    logger.info('MinIO initialized');

    // Initialize Email Service
    await emailService.initialize();

    // Start queue workers (reminder delivery via email; WhatsApp TODO)
    startWorkers();

    logger.info('All services initialized');
  } catch (error) {
    logger.error(
      { error },
      'Service initialization failed (check Prisma schema sync with `npm run db:push` if voice tables are missing)'
    );
    throw error;
  }
}

// Start server
async function start() {
  try {
    await initRuntimeConfig();
    startRuntimeConfigPolling();

    // Initialize services
    await initializeServices();

    // Register plugins
    await registerPlugins();

    // Register WebSocket
    registerWebSocket();

    // Global error handler — catches all unhandled route errors
    fastify.setErrorHandler((error, request, reply) => {
      const appError = error instanceof AppError ? error : new AppError(
        error instanceof Error ? error.message : String(error),
        error.statusCode ?? 500
      );

      ErrorHandler.logError(appError, {
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      const statusCode = appError.statusCode;
      reply.code(statusCode).send(ErrorHandler.formatErrorResponse(appError));
    });

    // Register routes
    await registerRoutes(fastify);

    // Start server
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`Server listening on ${config.host}:${config.port}`);
    logger.info(`WebSocket endpoint: ws://${config.host}:${config.port}/ws`);
    logger.info(`Environment: ${config.nodeEnv}`);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');

  try {
    // Close Fastify
    await fastify.close();

    // Close database
    await disconnectDB();

    // Close workers
    await closeWorkers();

    // Close queues
    await closeQueues();

    // Close cache
    await llmCache.close();

    // Close runtime config poller
    await stopRuntimeConfigPolling();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Setup global error handlers (unhandledRejection, uncaughtException)
setupGlobalErrorHandlers();

// Start the server
start();
