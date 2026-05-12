import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService, AuthError } from '../../application/identity/auth-service.js';
import { accountService } from '../../application/account/account-service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req, reply) => {
    const body = z.object({ username: z.string().min(2), password: z.string().min(6) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    try {
      const acc = await authService.verifyCredential(body.data.username, body.data.password, req.ip);
      const token = app.jwt.sign({
        sub: acc.id,
        username: acc.username,
        role: acc.role,
        orgId: acc.orgId,
        displayName: acc.displayName
      });
      await accountService.writeAudit(acc.id, 'login', undefined, undefined, req.ip);
      return { ok: true, data: { token, mustChangePwd: acc.mustChangePwd } };
    } catch (e) {
      if (e instanceof AuthError) return reply.code(401).send({ ok: false, error: e.code, message: e.message });
      throw e;
    }
  });

  app.get('/me', { preHandler: app.requireAuth() }, async (req) => {
    const profile = await authService.profile(req.principal!.id);
    return { ok: true, data: profile };
  });

  app.post('/change-password', { preHandler: app.requireAuth() }, async (req, reply) => {
    const body = z.object({ oldPassword: z.string().min(6), newPassword: z.string().min(8) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false, message: '参数有误' });
    try {
      await authService.changePassword(req.principal!.id, body.data.oldPassword, body.data.newPassword);
      await accountService.writeAudit(req.principal!.id, 'change_password', undefined, undefined, req.ip);
      return { ok: true };
    } catch (e) {
      if (e instanceof AuthError) return reply.code(400).send({ ok: false, error: e.code, message: e.message });
      throw e;
    }
  });

  app.post('/logout', { preHandler: app.requireAuth() }, async (req) => {
    await accountService.writeAudit(req.principal!.id, 'logout', undefined, undefined, req.ip);
    return { ok: true };
  });
}
