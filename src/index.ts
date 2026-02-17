import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from './config';
import { logger } from './lib/logger';
import { disconnectDB, ensureVoiceSchemaReady } from './lib/database';
import { closeQueues } from './lib/queue';
import { minioClient } from './lib/minio';
import { registerRoutes } from './routes';
import { websocketHandler } from './websocket/handler';
import { enhancedWebsocketHandler } from './websocket/enhanced-handler';

// Choose WebSocket handler based on configuration
const useEnhancedAudio = process.env.USE_ENHANCED_AUDIO !== 'false'; // Default to enhanced
const wsHandler = useEnhancedAudio ? enhancedWebsocketHandler : websocketHandler;

// Create Fastify instance
const fastify = Fastify({
  logger: logger as any,
  trustProxy: true,
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(fastifyCors, {
    origin: true,
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
    if (useEnhancedAudio) {
      await ensureVoiceSchemaReady();
      logger.info('Voice schema preflight check passed');
    }

    // Initialize MinIO
    await minioClient.initialize();
    logger.info('MinIO initialized');

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
    // Initialize services
    await initializeServices();

    // Register plugins
    await registerPlugins();

    // Register WebSocket
    registerWebSocket();

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

    // Close queues
    await closeQueues();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

// Start the server
start();
