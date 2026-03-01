import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { register, httpRequestDuration, httpRequestCounter, errorCounter } from '../infrastructure/metrics';

export async function metricsPlugin(fastify: FastifyInstance) {
    // Metrics endpoint
    fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
        reply.header('Content-Type', register.contentType);
        return register.metrics();
    });

    // Request tracking middleware
    fastify.addHook('onRequest', async (request, reply) => {
        request.startTime = Date.now();
        const incomingRequestId = request.headers['x-request-id'];
        request.requestId = (typeof incomingRequestId === 'string' && incomingRequestId.trim()) || request.id;
        reply.header('x-request-id', request.requestId);

        if (request.url !== '/metrics') {
            request.log.info(
                {
                    requestId: request.requestId,
                    method: request.method,
                    url: request.url,
                    ip: request.ip,
                    userAgent: request.headers['user-agent'],
                },
                'HTTP request started'
            );
        }
    });

    fastify.addHook('onResponse', async (request, reply) => {
        const responseTime = (Date.now() - (request.startTime || Date.now())) / 1000;
        const responseTimeMs = Math.round(responseTime * 1000);

        const route = request.routeOptions?.url || request.url;
        const method = request.method;
        const statusCode = reply.statusCode.toString();

        // Record metrics
        httpRequestDuration.observe(
            { method, route, status_code: statusCode },
            responseTime
        );

        httpRequestCounter.inc({
            method,
            route,
            status_code: statusCode,
        });

        if (request.url !== '/metrics') {
            request.log.info(
                {
                    requestId: request.requestId,
                    method,
                    route,
                    statusCode: reply.statusCode,
                    responseTimeMs,
                },
                'HTTP request completed'
            );
        }
    });

    fastify.addHook('onError', async (request, _reply, error) => {
        const errType =
            (error as any)?.code ||
            (error as any)?.name ||
            (error as any)?.statusCode?.toString?.() ||
            'unknown';

        errorCounter.inc({
            service: 'api',
            type: String(errType),
        });

        request.log.error(
            {
                requestId: request.requestId,
                method: request.method,
                url: request.url,
                errType,
                errorMessage: error.message,
            },
            'HTTP request failed'
        );
    });
}

// Extend FastifyRequest type to include startTime
declare module 'fastify' {
    interface FastifyRequest {
        startTime?: number;
        requestId?: string;
    }
}
