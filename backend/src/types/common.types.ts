export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
}

export interface TimeRange {
  startTime: string
  endTime: string
}

export type EnergyType = 'electricity' | 'gas' | 'water' | 'steam'
export type Scope = 'scope1' | 'scope2' | 'scope3'
export type DeviceProtocol = 'mqtt' | 'modbus' | 'http' | 'manual'
export type DeviceStatus = 'online' | 'offline' | 'warning' | 'maintenance'
export type AlarmSeverity = 'info' | 'warning' | 'critical'
export type AlarmStatus = 'active' | 'acknowledged' | 'resolved'
export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer'
