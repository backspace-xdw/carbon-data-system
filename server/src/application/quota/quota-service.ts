import { prisma } from '../../infrastructure/persistence/prisma.js';
import { carbonService } from '../carbon/carbon-service.js';

export const quotaService = {
  async list(period?: string) {
    return prisma.complianceQuota.findMany({
      where: { period },
      include: { org: { select: { id: true, code: true, name: true } } },
      orderBy: [{ period: 'desc' }, { orgId: 'asc' }]
    });
  },

  async upsert(data: { period: string; orgId: number; allocated: number; source?: string; remark?: string }) {
    const existing = await prisma.complianceQuota.findFirst({
      where: { period: data.period, orgId: data.orgId, source: data.source || 'government' }
    });
    if (existing) {
      return prisma.complianceQuota.update({
        where: { id: existing.id },
        data: { allocated: data.allocated, remark: data.remark }
      });
    }
    return prisma.complianceQuota.create({
      data: {
        period: data.period,
        orgId: data.orgId,
        allocated: data.allocated,
        source: data.source || 'government',
        remark: data.remark
      }
    });
  },

  async settle(period: string) {
    const start = `${period}-01-01T00:00:00Z`;
    const stop = `${parseInt(period, 10) + 1}-01-01T00:00:00Z`;
    const footprint = await carbonService.accountFootprint(start, stop);
    const totalUsed = footprint.totalT;
    const quotas = await prisma.complianceQuota.findMany({ where: { period } });
    for (const q of quotas) {
      const share = totalUsed * (q.allocated / Math.max(quotas.reduce((s, x) => s + x.allocated, 0), 1));
      await prisma.complianceQuota.update({ where: { id: q.id }, data: { used: share } });
    }
    return { period, totalUsed, count: quotas.length };
  },

  async overview(period: string) {
    const quotas = await prisma.complianceQuota.findMany({
      where: { period },
      include: { org: true }
    });
    const totalAllocated = quotas.reduce((s, q) => s + q.allocated, 0);
    const totalUsed = quotas.reduce((s, q) => s + q.used, 0);
    return {
      period,
      totalAllocated,
      totalUsed,
      remaining: totalAllocated - totalUsed,
      ratio: totalAllocated > 0 ? totalUsed / totalAllocated : 0,
      items: quotas
    };
  }
};
