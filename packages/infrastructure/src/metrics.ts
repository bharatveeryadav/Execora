import promClient from 'prom-client';

// Create a Registry which registers the metrics
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({ register });

// Custom Application Metrics

// HTTP Request Duration
export const httpRequestDuration = new promClient.Histogram({
	name: 'http_request_duration_seconds',
	help: 'Duration of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status_code'],
	buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
	registers: [register],
});

// HTTP Request Counter
export const httpRequestCounter = new promClient.Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status_code'],
	registers: [register],
});

// WebSocket Connections
export const websocketConnections = new promClient.Gauge({
	name: 'websocket_connections_active',
	help: 'Number of active WebSocket connections',
	registers: [register],
});

// Voice Commands Processed
export const voiceCommandsProcessed = new promClient.Counter({
	name: 'voice_commands_total',
	help: 'Total number of voice commands processed',
	labelNames: ['status', 'provider'],
	registers: [register],
});

// Invoice Operations
export const invoiceOperations = new promClient.Counter({
	name: 'invoice_operations_total',
	help: 'Total number of invoice operations',
	labelNames: ['operation', 'status', 'tenantId'],
	registers: [register],
});

// LLM Usage Metrics
export const llmRequestsTotal = new promClient.Counter({
	name: 'llm_requests_total',
	help: 'Total number of LLM requests',
	labelNames: ['model', 'operation', 'intent', 'cache'],
	registers: [register],
});

export const llmTokensTotal = new promClient.Counter({
	name: 'llm_tokens_total',
	help: 'Total LLM tokens by type',
	labelNames: ['model', 'operation', 'intent', 'type'],
	registers: [register],
});

export const llmCostUsdTotal = new promClient.Counter({
	name: 'llm_cost_usd_total',
	help: 'Estimated LLM cost in USD',
	labelNames: ['model', 'operation', 'intent'],
	registers: [register],
});

// Payment Processing
export const paymentProcessing = new promClient.Counter({
	name: 'payments_processed_total',
	help: 'Total number of payments processed',
	labelNames: ['status'],
	registers: [register],
});

// ── Sprint 2: AI Feature Metrics ──────────────────────────────────────────────

// OCR Job tracking
export const ocrJobsTotal = new promClient.Counter({
	name: 'ai_ocr_jobs_total',
	help: 'Total OCR jobs processed',
	labelNames: ['job_type', 'status', 'tenantId'],
	registers: [register],
});

export const ocrJobDuration = new promClient.Histogram({
	name: 'ai_ocr_job_duration_seconds',
	help: 'Duration of OCR jobs in seconds',
	labelNames: ['job_type'],
	buckets: [0.5, 1, 2, 5, 10, 20, 30],
	registers: [register],
});

export const catalogSeedProductsTotal = new promClient.Counter({
	name: 'ai_catalog_seed_products_total',
	help: 'Total products seeded from AI photo extraction',
	labelNames: ['tenantId'],
	registers: [register],
});

export const replenishmentSuggestionsTotal = new promClient.Counter({
	name: 'ai_replenishment_suggestions_total',
	help: 'Total replenishment suggestions served',
	labelNames: ['tenantId'],
	registers: [register],
});

export const anomalyDetectionsTotal = new promClient.Counter({
	name: 'ai_anomaly_detections_total',
	help: 'Total invoice anomaly checks performed',
	labelNames: ['is_anomaly', 'severity', 'tenantId'],
	registers: [register],
});

export const predictiveRemindersScheduled = new promClient.Counter({
	name: 'ai_predictive_reminders_scheduled_total',
	help: 'Total predictive reminders scheduled by AI engine',
	labelNames: ['tenantId'],
	registers: [register],
});

export const paymentAmount = new promClient.Histogram({
	name: 'payment_amount_inr',
	help: 'Payment amounts in INR',
	labelNames: ['customer_id'],
	buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
	registers: [register],
});

// Database Query Duration
export const dbQueryDuration = new promClient.Histogram({
	name: 'db_query_duration_seconds',
	help: 'Database query duration in seconds',
	labelNames: ['operation', 'table'],
	buckets: [0.001, 0.01, 0.1, 0.5, 1, 2],
	registers: [register],
});

export const dbQueriesTotal = new promClient.Counter({
	name: 'db_queries_total',
	help: 'Total number of database queries',
	labelNames: ['operation', 'table', 'status'],
	registers: [register],
});

export const dbAuditEventsTotal = new promClient.Counter({
	name: 'db_audit_events_total',
	help: 'Total number of database mutation audit events',
	labelNames: ['operation', 'model', 'status'],
	registers: [register],
});

// Redis Operations
export const redisOperations = new promClient.Counter({
	name: 'redis_operations_total',
	help: 'Total number of Redis operations',
	labelNames: ['operation', 'status'],
	registers: [register],
});

// STT/TTS Processing Time
export const sttProcessingTime = new promClient.Histogram({
	name: 'stt_processing_duration_seconds',
	help: 'Speech-to-Text processing duration',
	labelNames: ['provider'],
	buckets: [0.1, 0.5, 1, 2, 5, 10],
	registers: [register],
});

export const ttsProcessingTime = new promClient.Histogram({
	name: 'tts_processing_duration_seconds',
	help: 'Text-to-Speech processing duration',
	labelNames: ['provider'],
	buckets: [0.1, 0.5, 1, 2, 5, 10],
	registers: [register],
});

// STT / TTS request counters
export const sttRequestsTotal = new promClient.Counter({
	name: 'stt_requests_total',
	help: 'Total STT requests by provider, operation, and result',
	labelNames: ['provider', 'operation', 'status'],
	registers: [register],
});

export const ttsRequestsTotal = new promClient.Counter({
	name: 'tts_requests_total',
	help: 'Total TTS requests by provider, operation, and result',
	labelNames: ['provider', 'operation', 'status'],
	registers: [register],
});

// Provider availability gauge — 1=available, 0=unavailable
export const providerAvailability = new promClient.Gauge({
	name: 'provider_available',
	help: 'Whether a provider is currently available (1=yes, 0=no)',
	labelNames: ['provider', 'type'],
	registers: [register],
});

// Conversation Memory Stats
export const conversationMemorySize = new promClient.Gauge({
	name: 'conversation_memory_messages',
	help: 'Number of messages in conversation memory',
	labelNames: ['conversation_id'],
	registers: [register],
});

// Task Queue Metrics
export const taskQueueSize = new promClient.Gauge({
	name: 'task_queue_pending',
	help: 'Number of pending tasks in queue',
	labelNames: ['queue_name'],
	registers: [register],
});

export const taskProcessingTime = new promClient.Histogram({
	name: 'task_processing_duration_seconds',
	help: 'Task processing duration',
	labelNames: ['task_type', 'status'],
	buckets: [0.1, 1, 5, 10, 30, 60],
	registers: [register],
});

// Error Counter
export const errorCounter = new promClient.Counter({
	name: 'errors_total',
	help: 'Total number of errors',
	labelNames: ['service', 'type'],
	registers: [register],
});

// Queue / Worker Metrics (production monitoring)
export const queueDepth = new promClient.Gauge({
	name: 'queue_jobs_depth',
	help: 'Current queue depth by queue and state',
	labelNames: ['queue', 'state'],
	registers: [register],
});

export const queueJobsProcessed = new promClient.Counter({
	name: 'queue_jobs_processed_total',
	help: 'Total queue jobs processed by queue and result status',
	labelNames: ['queue', 'status'],
	registers: [register],
});

export const queueJobDuration = new promClient.Histogram({
	name: 'queue_job_duration_seconds',
	help: 'Queue job processing duration in seconds',
	labelNames: ['queue', 'status'],
	buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
	registers: [register],
});
