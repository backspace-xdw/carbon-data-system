import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { energyService } from '../../application/energy/energy-service.js';
import { riskService } from '../../application/risk/risk-service.js';

export async function energyRoutes(app: FastifyInstance) {
  // 手工补录或网关 HTTP 推送
  app.post('/ingest', { preHandler: app.requireAuth('data_steward') }, async (req, reply) => {
    const body = z.object({
      meterCode: z.string(),
      value: z.number(),
      ts: z.number().int().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    const r = await energyService.ingest(body.data);
    if (!r) return reply.code(404).send({ ok: false, message: '计量点未登记或已停用' });
    riskService.evaluate(body.data.meterCode, r.value).catch(() => undefined);
    return { ok: true, data: r };
  });

  app.get('/readings', { preHandler: app.requireAuth() }, async (req, reply) => {
    const q = req.query as any;
    if (!q.meterCode) return reply.code(400).send({ ok: false, message: 'meterCode 必填' });
    const rows = await energyService.readingsByMeter(q.meterCode, {
      start: q.start || '-24h',
      stop: q.stop || 'now()',
      every: q.every || '15m'
    });
    return { ok: true, data: rows };
  });

  app.get('/sum-by-type', { preHandler: app.requireAuth() }, async (req) => {
    const q = req.query as any;
    return { ok: true, data: await energyService.sumByType({ start: q.start || '-30d', stop: q.stop || 'now()' }) };
  });
}
