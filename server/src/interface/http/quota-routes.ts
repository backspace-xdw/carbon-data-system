import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { quotaService } from '../../application/quota/quota-service.js';

export async function quotaRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.requireAuth() }, async (req) => {
    const q = req.query as any;
    return { ok: true, data: await quotaService.list(q.period) };
  });

  app.get('/overview', { preHandler: app.requireAuth() }, async (req) => {
    const q = req.query as any;
    return { ok: true, data: await quotaService.overview(q.period || String(new Date().getUTCFullYear())) };
  });

  app.post('/', { preHandler: app.requireAuth('park_admin') }, async (req, reply) => {
    const body = z.object({
      period: z.string().regex(/^\d{4}$/),
      orgId: z.number().int(),
      allocated: z.number().nonnegative(),
      source: z.string().optional(),
      remark: z.string().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    return { ok: true, data: await quotaService.upsert(body.data) };
  });

  app.post('/settle', { preHandler: app.requireAuth('park_admin') }, async (req, reply) => {
    const body = z.object({ period: z.string() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    return { ok: true, data: await quotaService.settle(body.data.period) };
  });
}
