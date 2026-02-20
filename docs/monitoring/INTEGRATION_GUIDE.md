// Integration guide for adding metrics to your Execora application

// 1. Import the metrics plugin in src/index.ts
import { metricsPlugin } from './lib/metrics-plugin';
import { websocketConnections } from './lib/metrics';

// 2. Register the metrics plugin with other plugins
async function registerPlugins() {
  // ... existing plugins ...
  
  // Metrics endpoint
  await fastify.register(metricsPlugin);
}

// 3. Track WebSocket connections in websocket/enhanced-handler.ts
import { websocketConnections, voiceCommandsProcessed } from '../lib/metrics';

// In your WebSocket handler:
connection.socket.on('open', () => {
  websocketConnections.inc(); // Increment active connections
});

connection.socket.on('close', () => {
  websocketConnections.dec(); // Decrement active connections
});

// Track voice commands
connection.socket.on('message', async (message) => {
  try {
    // ... process message ...
    voiceCommandsProcessed.inc({ status: 'success', provider: sttProvider });
  } catch (error) {
    voiceCommandsProcessed.inc({ status: 'error', provider: sttProvider });
  }
});

// 4. Track invoice operations in business/invoice.service.ts
import { invoiceOperations } from '../lib/metrics';

async function createInvoice(data: InvoiceData) {
  try {
    // ... create invoice ...
    invoiceOperations.inc({ operation: 'create', status: 'success' });
    return invoice;
  } catch (error) {
    invoiceOperations.inc({ operation: 'create', status: 'error' });
    throw error;
  }
}

// 5. Track payments in business/ledger.service.ts
import { paymentProcessing, paymentAmount } from '../lib/metrics';

async function recordPayment(customerId: number, amount: number) {
  try {
    // ... record payment ...
    paymentProcessing.inc({ status: 'success' });
    paymentAmount.observe({ customer_id: customerId.toString() }, amount);
    return payment;
  } catch (error) {
    paymentProcessing.inc({ status: 'error' });
    throw error;
  }
}

// 6. Track database queries in lib/database.ts
import { dbQueryDuration } from './metrics';

async function executeQuery(query: string, table: string) {
  const end = dbQueryDuration.startTimer({ operation: 'select', table });
  try {
    const result = await prisma.$queryRaw(query);
    end(); // Records duration
    return result;
  } catch (error) {
    end();
    throw error;
  }
}

// 7. Track STT/TTS processing time in services/stt-deepgram.service.ts
import { sttProcessingTime } from '../lib/metrics';

async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const end = sttProcessingTime.startTimer({ provider: 'deepgram' });
  try {
    // ... transcribe ...
    const result = await deepgram.transcribe(audioBuffer);
    end();
    return result;
  } catch (error) {
    end();
    throw error;
  }
}

// 8. Update logger to write to file (for Loki)
// src/lib/logger.ts
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logDir = path.join(__dirname, '../../logs');
fs.mkdirSync(logDir, { recursive: true });

export const logger = pino({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
}, pino.multistream([
  { stream: process.stdout }, // Console
  { stream: pino.destination(path.join(logDir, 'app.log')) }, // File
]));

// 9. Add metrics port to config
// src/config/index.ts
export const config = {
  // ... existing config ...
  metricsPort: process.env.METRICS_PORT || 9091,
};

// 10. Start metrics server separately (optional)
// If you want metrics on a different port
import http from 'http';
import { register } from './lib/metrics';

const metricsServer = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

metricsServer.listen(config.metricsPort, () => {
  logger.info(`Metrics server listening on port ${config.metricsPort}`);
});
