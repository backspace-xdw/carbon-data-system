import bcrypt from 'bcryptjs';
import { prisma } from '../../infrastructure/persistence/prisma.js';
import type { Role } from '../../domain/identity/types.js';

export const accountService = {
  async listAccounts() {
    return prisma.account.findMany({
      include: { org: { select: { id: true, code: true, name: true } } },
      orderBy: { id: 'asc' }
    });
  },

  async createAccount(data: { username: string; password: string; displayName: string; role: Role; orgId?: number }) {
    const hash = await bcrypt.hash(data.password, 10);
    return prisma.account.create({
      data: {
        username: data.username,
        passwordHash: hash,
        displayName: data.displayName,
        role: data.role,
        orgId: data.orgId,
        mustChangePwd: true
      }
    });
  },

  async updateAccount(id: number, patch: Partial<{ displayName: string; role: Role; status: string; orgId: number }>) {
    return prisma.account.update({ where: { id }, data: patch });
  },

  async resetPassword(id: number, newPwd: string) {
    const hash = await bcrypt.hash(newPwd, 10);
    return prisma.account.update({ where: { id }, data: { passwordHash: hash, mustChangePwd: true } });
  },

  async listOrgs() {
    return prisma.organization.findMany({ orderBy: { id: 'asc' } });
  },

  async createOrg(data: { code: string; name: string; parentId?: number; kind?: string; remark?: string }) {
    return prisma.organization.create({ data });
  },

  async updateOrg(id: number, patch: Partial<{ name: string; parentId: number; kind: string; remark: string }>) {
    return prisma.organization.update({ where: { id }, data: patch });
  },

  async listAudits(limit = 200) {
    return prisma.auditLog.findMany({
      include: { account: { select: { id: true, username: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  },

  async writeAudit(accountId: number | null, action: string, target?: string, detail?: string, ip?: string) {
    await prisma.auditLog.create({ data: { accountId, action, target, detail, ip } });
  }
};
