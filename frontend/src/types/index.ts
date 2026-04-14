export type EnergyType = 'electricity' | 'gas' | 'water' | 'steam'
export type Scope = 'scope1' | 'scope2' | 'scope3'
export type AlarmSeverity = 'info' | 'warning' | 'critical'
export type AlarmStatus = 'active' | 'acknowledged' | 'resolved'

export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
  total?: number
  page?: number
  pageSize?: number
}

export interface Device {
  id: string
  name: string
  energy_type: EnergyType
  device_type: string
  protocol: string
  area_id: string
  area_name?: string
  scope: Scope
  status: string
  manufacturer?: string
  model?: string
  last_seen_at?: string
  created_at: string
}

export interface EmissionFactor {
  id: string
  energy_type: string
  name: string
  factor_value: number
  factor_unit: string
  source_unit: string
  scope: string
  region?: string
  source?: string
  valid_year?: number
  is_default: number
  status: string
}

export interface AlarmRecord {
  id: string
  rule_id: string
  rule_name?: string
  category?: string
  device_id?: string
  area_id?: string
  severity: AlarmSeverity
  title: string
  message: string
  current_value?: number
  threshold_value?: number
  status: AlarmStatus
  created_at: string
  acknowledged_at?: string
  resolved_at?: string
}

export interface Area {
  id: string
  name: string
  parent_id?: string
  type: string
  description?: string
  sort_order: number
}

export interface DashboardOverview {
  carbonEmission: {
    today: number
    thisMonth: number
    thisYear: number
    quota: number
    quotaUsagePct: number
  }
  deviceSummary: {
    total: number
    online: number
    offline: number
    warning: number
  }
  alarmSummary: {
    active: number
    critical: number
    warning: number
  }
}

export interface EnergyRealtimeData {
  deviceId: string
  energyType: EnergyType
  areaId: string
  timestamp: string
  data: Record<string, number>
}
