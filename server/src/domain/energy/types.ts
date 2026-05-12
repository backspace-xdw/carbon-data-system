export type EnergyType = 'electricity' | 'gas' | 'water' | 'steam' | 'heat' | 'coal';

export const ENERGY_LABEL: Record<EnergyType, string> = {
  electricity: '电力',
  gas: '天然气',
  water: '水',
  steam: '蒸汽',
  heat: '热力',
  coal: '原煤'
};

export const DEFAULT_UNIT: Record<EnergyType, string> = {
  electricity: 'kWh',
  gas: 'm³',
  water: 't',
  steam: 't',
  heat: 'GJ',
  coal: 't'
};

// 单位标准煤换算系数 kgce / 单位 (GB/T 2589)
export const COAL_EQUIVALENT: Record<EnergyType, number> = {
  electricity: 0.1229,
  gas: 1.330,
  water: 0.0857,
  steam: 94.16,
  heat: 34.12,
  coal: 714.3
};
