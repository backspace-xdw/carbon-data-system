import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { meterService } from '../../application/meter/meter-service.js';
import { accountService } from '../../application/account/account-service.js';

const energyEnum = z.enum(['electricity', 'gas', 'water', 'steam', 'heat', 'coal']);

export async function meterRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.requireAuth() }, async (req) => {
    const q = req.query as any;
    return { ok: true, data: await meterService.list({ orgId: q.orgId && +q.orgId, energyType: q.energyType, status: q.status }) };
  });

  app.get('/:id', { preHandler: app.requireAuth() }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const m = await meterService.get(id);
    if (!m) return reply.code(404).send({ ok: false, message: '计量点不存在' });
    return { ok: true, data: m };
  });

  app.post('/', { preHandler: app.requireAuth('data_steward') }, async (req, reply) => {
    const body = z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      energyType: energyEnum,
      orgId: z.number().int(),
      unit: z.string().optional(),
      location: z.string().optional(),
      scaleFactor: z.number().optional(),
      mqttTopic: z.string().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    const m = await meterService.create(body.data);
    await accountService.writeAudit(req.principal!.id, 'meter.create', String(m.id), m.code, req.ip);
    return { ok: true, data: m };
  });

  app.put('/:id', { preHandler: app.requireAuth('data_steward') }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = z.object({
      name: z.string().optional(),
      location: z.string().optional(),
      status: z.string().optional(),
      scaleFactor: z.number().optional(),
      mqttTopic: z.string().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    const m = await meterService.update(id, body.data);
    await accountService.writeAudit(req.principal!.id, 'meter.update', String(id), undefined, req.ip);
    return { ok: true, data: m };
  });

  app.delete('/:id', { preHandler: app.requireAuth('park_admin') }, async (req) => {
    const id = Number((req.params as any).id);
    await meterService.remove(id);
    await accountService.writeAudit(req.principal!.id, 'meter.delete', String(id), undefined, req.ip);
    return { ok: true };
  });
}
