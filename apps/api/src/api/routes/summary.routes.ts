import { FastifyInstance, FastifyRequest } from "fastify";
import { getDailySummary, getSummaryRange } from "@execora/modules";

export async function summaryRoutes(fastify: FastifyInstance) {
  // GET /api/v1/summary/daily?date=YYYY-MM-DD (date optional, defaults to today)
  fastify.get(
    "/api/v1/summary/daily",
    async (
      request: FastifyRequest<{
        Querystring: { date?: string };
      }>,
    ) => {
      const date = request.query.date
        ? new Date(request.query.date)
        : new Date();
      const summary = await getDailySummary(date);
      return { summary };
    },
  );

  // GET /api/v1/summary/range?from=YYYY-MM-DD&to=YYYY-MM-DD
  fastify.get(
    "/api/v1/summary/range",
    async (
      request: FastifyRequest<{
        Querystring: { from?: string; to?: string };
      }>,
      reply,
    ) => {
      const { from, to } = request.query;
      if (!from || !to) {
        return reply
          .code(400)
          .send({
            error: "Both from and to query params are required (YYYY-MM-DD)",
          });
      }
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return reply
          .code(400)
          .send({ error: "Invalid date format — use YYYY-MM-DD" });
      }
      const summary = await getSummaryRange(fromDate, toDate);
      return { summary };
    },
  );
}
