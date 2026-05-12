import type { EnergyType } from '../energy/types.js';

// 默认排放因子 kgCO2e / 单位 (IPCC + 生态环境部 2024)
export const DEFAULT_FACTORS: Record<EnergyType, { factor: number; unit: string; source: string }> = {
  electricity: { factor: 0.5703, unit: 'kWh', source: '生态环境部2024全国电网平均' },
  gas:         { factor: 2.162,  unit: 'm³',  source: 'IPCC 2006 默认值' },
  water:       { factor: 0.91,   unit: 't',   source: '行业 LCA 平均' },
  steam:       { factor: 110,    unit: 't',   source: '行业典型工业蒸汽' },
  heat:        { factor: 73.6,   unit: 'GJ',  source: 'IPCC 2006 默认值' },
  coal:        { factor: 1900,   unit: 't',   source: 'IPCC 2006 烟煤平均' }
};

// 千克转吨
export const KG_PER_T = 1000;

export function pickFactor(et: EnergyType): number {
  return DEFAULT_FACTORS[et]?.factor ?? 0;
}
