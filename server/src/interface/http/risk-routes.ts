import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { riskService } from '../../application/risk/risk-service.js';

export async function riskRoutes(app: FastifyInstance) {
  app.get('/rules', { preHandler: app.requireAuth() }, async () => {
    return { ok: true, data: await riskService.listRules() };
  });

  app.post('/rules', { preHandler: app.requireAuth('park_admin') }, async (req, reply) => {
    const body = z.object({
      code: z.string(), name: z.string(),
      scope: z.enum(['meter', 'org', 'global']),
      metric: z.string(),
      operator: z.enum(['gt', 'gte', 'lt', 'lte', 'between', 'outside']),
      threshold: z.string(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      cooldownSec: z.number().int().optional(),
      enabled: z.boolean().optional(),
      remark: z.string().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    return { ok: true, data: await riskService.upsertRule(body.data) };
  });

  app.get('/events', { preHandler: app.requireAuth() }, async (req) => {
    const q = req.query as any;
    return { ok: true, data: await riskService.listEvents({ status: q.status, severity: q.severity, limit: q.limit && +q.limit }) };
  });

  app.post('/events/:id/ack', { preHandler: app.requireAuth('data_steward') }, async (req) => {
    const id = Number((req.params as any).id);
    return { ok: true, data: await riskService.ack(id, req.principal!.id) };
  });

  app.post('/events/:id/close', { preHandler: app.requireAuth('data_steward') }, async (req) => {
    const id = Number((req.params as any).id);
    const body = z.object({ note: z.string().optional() }).safeParse(req.body || {});
    return { ok: true, data: await riskService.close(id, req.principal!.id, body.success ? body.data.note : undefined) };
  });
}
