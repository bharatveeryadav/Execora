import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { register, httpRequestDuration, httpRequestCounter } from '../infrastructure/metrics';

export async function metricsPlugin(fastify: FastifyInstance) {
    // Metrics endpoint
    fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
        reply.header('Content-Type', register.contentType);
        return register.metrics();
    });

    // Request tracking middleware
    fastify.addHook('onRequest', async (request, reply) => {
        request.startTime = Date.now();
    });

    fastify.addHook('onResponse', async (request, reply) => {
        const responseTime = (Date.now() - (request.startTime || Date.now())) / 1000;

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
    });
}

// Extend FastifyRequest type to include startTime
declare module 'fastify' {
    interface FastifyRequest {
        startTime?: number;
    }
}
