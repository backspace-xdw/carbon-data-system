import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { reportService } from '../../application/report/report-service.js';

export async function reportRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.requireAuth() }, async (req) => {
    const q = req.query as any;
    return { ok: true, data: await reportService.list({ period: q.period, channel: q.channel }) };
  });

  app.post('/prepare', { preHandler: app.requireAuth('data_steward') }, async (req, reply) => {
    const body = z.object({
      period: z.string(),
      orgId: z.number().int(),
      channel: z.enum(['gov_energy', 'gov_carbon', 'mrv'])
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    return { ok: true, data: await reportService.prepare(body.data.period, body.data.orgId, body.data.channel) };
  });

  app.post('/:id/submit', { preHandler: app.requireAuth('park_admin') }, async (req) => {
    const id = Number((req.params as any).id);
    return { ok: true, data: await reportService.submit(id) };
  });

  app.post('/:id/mark', { preHandler: app.requireAuth('park_admin') }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = z.object({
      status: z.enum(['accepted', 'rejected']),
      response: z.string().optional(),
      reason: z.string().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    return { ok: true, data: await reportService.mark(id, body.data.status, body.data.response, body.data.reason) };
  });
}
