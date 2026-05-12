import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import { env } from '../../config/env.js';
import type { Role } from '../../domain/identity/types.js';
import { ROLE_RANK } from '../../domain/identity/types.js';

declare module 'fastify' {
  interface FastifyRequest {
    principal?: { id: number; username: string; role: Role; orgId: number | null; displayName: string };
  }
  interface FastifyInstance {
    requireAuth: (minRole?: Role) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: env.JWT_TTL } });

  app.decorate('requireAuth', (minRole: Role = 'observer') => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = await req.jwtVerify<{ sub: number; username: string; role: Role; orgId: number | null; displayName: string }>();
        req.principal = {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
          orgId: payload.orgId ?? null,
          displayName: payload.displayName
        };
        if (ROLE_RANK[req.principal.role] < ROLE_RANK[minRole]) {
          return reply.code(403).send({ ok: false, error: 'forbidden', message: '权限不足' });
        }
      } catch {
        return reply.code(401).send({ ok: false, error: 'unauthorized', message: '请先登录' });
      }
    };
  });
}
