import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { accountService } from '../../application/account/account-service.js';

const roleEnum = z.enum(['platform_admin', 'park_admin', 'data_steward', 'observer']);

export async function accountRoutes(app: FastifyInstance) {
  app.get('/accounts', { preHandler: app.requireAuth('park_admin') }, async () => {
    return { ok: true, data: await accountService.listAccounts() };
  });

  app.post('/accounts', { preHandler: app.requireAuth('park_admin') }, async (req, reply) => {
    const body = z.object({
      username: z.string().min(2),
      password: z.string().min(8),
      displayName: z.string().min(1),
      role: roleEnum,
      orgId: z.number().int().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    const acc = await accountService.createAccount(body.data);
    await accountService.writeAudit(req.principal!.id, 'account.create', String(acc.id), acc.username, req.ip);
    return { ok: true, data: acc };
  });

  app.put('/accounts/:id', { preHandler: app.requireAuth('park_admin') }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = z.object({
      displayName: z.string().optional(),
      role: roleEnum.optional(),
      status: z.string().optional(),
      orgId: z.number().int().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    const acc = await accountService.updateAccount(id, body.data);
    await accountService.writeAudit(req.principal!.id, 'account.update', String(id), undefined, req.ip);
    return { ok: true, data: acc };
  });

  app.post('/accounts/:id/reset', { preHandler: app.requireAuth('park_admin') }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = z.object({ newPassword: z.string().min(8) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    await accountService.resetPassword(id, body.data.newPassword);
    await accountService.writeAudit(req.principal!.id, 'account.reset_password', String(id), undefined, req.ip);
    return { ok: true };
  });

  app.get('/orgs', { preHandler: app.requireAuth() }, async () => {
    return { ok: true, data: await accountService.listOrgs() };
  });

  app.post('/orgs', { preHandler: app.requireAuth('park_admin') }, async (req, reply) => {
    const body = z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      parentId: z.number().int().optional(),
      kind: z.string().optional(),
      remark: z.string().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    const org = await accountService.createOrg(body.data);
    await accountService.writeAudit(req.principal!.id, 'org.create', String(org.id), org.code, req.ip);
    return { ok: true, data: org };
  });

  app.put('/orgs/:id', { preHandler: app.requireAuth('park_admin') }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const body = z.object({
      name: z.string().optional(),
      parentId: z.number().int().optional(),
      kind: z.string().optional(),
      remark: z.string().optional()
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    const org = await accountService.updateOrg(id, body.data);
    return { ok: true, data: org };
  });

  app.get('/audits', { preHandler: app.requireAuth('park_admin') }, async (req) => {
    const limit = Number((req.query as any)?.limit || 200);
    return { ok: true, data: await accountService.listAudits(limit) };
  });
}
