import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { carbonService } from '../../application/carbon/carbon-service.js';

export async function carbonRoutes(app: FastifyInstance) {
  app.get('/factors', { preHandler: app.requireAuth() }, async () => {
    return { ok: true, data: await carbonService.listFactors() };
  });

  app.post('/factors', { preHandler: app.requireAuth('park_admin') }, async (req, reply) => {
    const body = z.object({
      energyType: z.enum(['electricity', 'gas', 'water', 'steam', 'heat', 'coal']),
      factor: z.number().positive(),
      unit: z.string().min(1),
      effectiveFrom: z.string().datetime(),
      source: z.string().min(1),
      remark: z.string().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    const f = await carbonService.upsertFactor({ ...body.data, effectiveFrom: new Date(body.data.effectiveFrom) });
    return { ok: true, data: f };
  });

  app.get('/footprint', { preHandler: app.requireAuth() }, async (req) => {
    const q = req.query as any;
    return {
      ok: true,
      data: await carbonService.accountFootprint(q.start || '-30d', q.stop || 'now()')
    };
  });
}
