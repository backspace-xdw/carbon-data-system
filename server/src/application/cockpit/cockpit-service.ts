import { prisma } from '../../infrastructure/persistence/prisma.js';
import { carbonService } from '../carbon/carbon-service.js';
import { quotaService } from '../quota/quota-service.js';

export const cockpitService = {
  async summary() {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const monthStart = new Date(Date.UTC(yyyy, now.getUTCMonth(), 1)).toISOString();
    const yearStart = new Date(Date.UTC(yyyy, 0, 1)).toISOString();
    const monthFootprint = await carbonService.accountFootprint(monthStart, now.toISOString());
    const yearFootprint = await carbonService.accountFootprint(yearStart, now.toISOString());

    const [metersTotal, metersActive, openRisks, criticalRisks, quotas] = await Promise.all([
      prisma.meterPoint.count(),
      prisma.meterPoint.count({ where: { status: 'active' } }),
      prisma.riskEvent.count({ where: { status: 'open' } }),
      prisma.riskEvent.count({ where: { status: 'open', severity: 'critical' } }),
      quotaService.overview(String(yyyy))
    ]);

    return {
      generatedAt: now.toISOString(),
      year: yyyy,
      kpis: {
        yearTotalCO2eT: yearFootprint.totalT,
        monthTotalCO2eT: monthFootprint.totalT,
        metersTotal,
        metersActive,
        openRisks,
        criticalRisks,
        quotaAllocated: quotas.totalAllocated,
        quotaUsed: quotas.totalUsed,
        quotaRatio: quotas.ratio
      },
      monthBreakdown: monthFootprint.breakdown,
      yearBreakdown: yearFootprint.breakdown
    };
  },

  // 当年逐月碳排放(走 InfluxDB 聚合,失败则零)
  async monthlyTrend(year: number) {
    const rows: Array<{ month: number; co2eT: number }> = [];
    for (let m = 0; m < 12; m++) {
      const s = new Date(Date.UTC(year, m, 1)).toISOString();
      const e = new Date(Date.UTC(year, m + 1, 1)).toISOString();
      const f = await carbonService.accountFootprint(s, e);
      rows.push({ month: m + 1, co2eT: f.totalT });
    }
    return rows;
  }
};
