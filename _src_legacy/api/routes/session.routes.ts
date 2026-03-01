import { FastifyInstance, FastifyRequest } from 'fastify';
import { voiceSessionService } from '../../modules/voice/session.service';

function parseLimit(raw: unknown, defaultVal: number, maxVal = 100): number {
  const n = parseInt(String(raw ?? defaultVal), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

export async function sessionRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/sessions', async (request: FastifyRequest<{
    Querystring: { limit?: string };
  }>) => {
    const sessions = await voiceSessionService.getRecentSessions(parseLimit(request.query.limit, 20));
    return { sessions };
  });

  fastify.get('/api/v1/recordings/:id/url', async (request: FastifyRequest<{
    Params: { id: string };
  }>) => {
    const url = await voiceSessionService.getRecordingUrl(request.params.id);
    return { url };
  });
}
