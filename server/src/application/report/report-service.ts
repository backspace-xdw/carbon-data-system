import { prisma } from '../../infrastructure/persistence/prisma.js';
import { carbonService } from '../carbon/carbon-service.js';

export const reportService = {
  async list(filter: { period?: string; channel?: string } = {}) {
    return prisma.submissionRecord.findMany({
      where: { period: filter.period, channel: filter.channel },
      include: { org: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
  },

  async prepare(period: string, orgId: number, channel: string) {
    // period 形如 YYYYMM 或 YYYY,转 ISO 区间
    let start: string, stop: string;
    if (period.length === 6) {
      const y = parseInt(period.slice(0, 4), 10), m = parseInt(period.slice(4, 6), 10);
      start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
      stop = new Date(Date.UTC(y, m, 1)).toISOString();
    } else {
      const y = parseInt(period, 10);
      start = new Date(Date.UTC(y, 0, 1)).toISOString();
      stop = new Date(Date.UTC(y + 1, 0, 1)).toISOString();
    }
    const footprint = await carbonService.accountFootprint(start, stop);
    const payload = {
      period, orgId, channel,
      generatedAt: new Date().toISOString(),
      totalCO2eT: footprint.totalT,
      breakdown: footprint.breakdown
    };
    return prisma.submissionRecord.create({
      data: {
        period, orgId, channel,
        status: 'pending',
        payloadJson: JSON.stringify(payload)
      }
    });
  },

  async submit(id: number) {
    // 仅占位:实际接政府平台 API
    return prisma.submissionRecord.update({
      where: { id },
      data: { status: 'submitted', submittedAt: new Date() }
    });
  },

  async mark(id: number, status: 'accepted' | 'rejected', response?: string, reason?: string) {
    return prisma.submissionRecord.update({
      where: { id },
      data: {
        status,
        responseJson: response,
        rejectReason: reason,
        acceptedAt: status === 'accepted' ? new Date() : undefined
      }
    });
  }
};
