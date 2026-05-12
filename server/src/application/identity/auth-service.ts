import bcrypt from 'bcryptjs';
import { prisma } from '../../infrastructure/persistence/prisma.js';
import type { Role } from '../../domain/identity/types.js';

export class AuthError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export const authService = {
  async verifyCredential(username: string, password: string, ip?: string) {
    const acc = await prisma.account.findUnique({ where: { username } });
    if (!acc) throw new AuthError('credential_invalid', '账号或密码错误');
    if (acc.status !== 'active') throw new AuthError('account_disabled', '账号已停用');
    const ok = await bcrypt.compare(password, acc.passwordHash);
    if (!ok) throw new AuthError('credential_invalid', '账号或密码错误');
    await prisma.account.update({
      where: { id: acc.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip }
    });
    return acc;
  },

  async changePassword(accountId: number, oldPwd: string, newPwd: string) {
    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    if (!acc) throw new AuthError('not_found', '账号不存在');
    const ok = await bcrypt.compare(oldPwd, acc.passwordHash);
    if (!ok) throw new AuthError('credential_invalid', '原密码错误');
    if (newPwd.length < 8) throw new AuthError('weak_password', '新密码至少 8 位');
    const hash = await bcrypt.hash(newPwd, 10);
    await prisma.account.update({ where: { id: accountId }, data: { passwordHash: hash, mustChangePwd: false } });
  },

  async profile(accountId: number) {
    const acc = await prisma.account.findUnique({
      where: { id: accountId },
      include: { org: true }
    });
    if (!acc) throw new AuthError('not_found', '账号不存在');
    return {
      id: acc.id,
      username: acc.username,
      displayName: acc.displayName,
      role: acc.role as Role,
      org: acc.org ? { id: acc.org.id, code: acc.org.code, name: acc.org.name } : null,
      mustChangePwd: acc.mustChangePwd,
      lastLoginAt: acc.lastLoginAt
    };
  }
};
