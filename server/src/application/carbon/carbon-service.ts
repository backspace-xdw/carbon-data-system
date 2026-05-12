import { prisma } from '../../infrastructure/persistence/prisma.js';
import { energyService } from '../energy/energy-service.js';
import { DEFAULT_FACTORS, KG_PER_T, pickFactor } from '../../domain/carbon/factors.js';
import { ENERGY_LABEL, type EnergyType } from '../../domain/energy/types.js';

const ALL_TYPES: EnergyType[] = ['electricity', 'gas', 'water', 'steam', 'heat', 'coal'];

export const carbonService = {
  async listFactors() {
    const persisted = await prisma.carbonFactor.findMany({ orderBy: [{ energyType: 'asc' }, { effectiveFrom: 'desc' }] });
    if (persisted.length) return persisted;
    return ALL_TYPES.map((t, i) => ({
      id: -1 - i,
      energyType: t,
      factor: DEFAULT_FACTORS[t].factor,
      unit: DEFAULT_FACTORS[t].unit,
      source: DEFAULT_FACTORS[t].source,
      effectiveFrom: new Date(),
      effectiveTo: null,
      remark: '系统内置默认值',
      createdAt: new Date()
    }));
  },

  async upsertFactor(data: { energyType: EnergyType; factor: number; unit: string; effectiveFrom: Date; source: string; remark?: string }) {
    return prisma.carbonFactor.create({ data });
  },

  // 按时间区间核算碳足迹(基于能源时序数据)
  async accountFootprint(start: string, stop: string) {
    const sums = await energyService.sumByType({ start, stop });
    const breakdown = ALL_TYPES.map((t) => {
      const energy = sums[t] || 0;
      const factor = pickFactor(t);
      const co2eKg = energy * factor;
      return {
        energyType: t,
        label: ENERGY_LABEL[t],
        energy,
        unit: DEFAULT_FACTORS[t].unit,
        factor,
        co2eKg,
        co2eT: co2eKg / KG_PER_T
      };
    });
    const totalT = breakdown.reduce((acc, b) => acc + b.co2eT, 0);
    return { start, stop, totalT, breakdown };
  }
};
