import type { FastifyInstance } from 'fastify';
import { cockpitService } from '../../application/cockpit/cockpit-service.js';

export async function cockpitRoutes(app: FastifyInstance) {
  app.get('/summary', { preHandler: app.requireAuth() }, async () => {
    return { ok: true, data: await cockpitService.summary() };
  });

  app.get('/trend', { preHandler: app.requireAuth() }, async (req) => {
    const year = Number((req.query as any)?.year ?? new Date().getUTCFullYear());
    return { ok: true, data: await cockpitService.monthlyTrend(year) };
  });
}
