import { Point } from '@influxdata/influxdb-client'
import { getWriteApi, BUCKETS } from '../config/influxdb'
import { getDatabase } from '../config/database'
import { emitEnergyData, emitDeviceStatus } from '../config/socketio'
import { logger } from '../utils/logger'

interface DeviceConfig {
  id: string
  energy_type: string
  area_id: string
  scope: string
}

// Base values for each device
const deviceBaseValues: Record<string, Record<string, number>> = {
  'EM-001': { voltage: 380, current: 120, active_power: 78, total_energy: 150000 },
  'EM-002': { voltage: 380, current: 95, active_power: 62, total_energy: 120000 },
  'EM-003': { voltage: 220, current: 35, active_power: 13, total_energy: 45000 },
  'GM-001': { flow_rate: 15, pressure: 0.35, temperature: 22, total_volume: 50000 },
  'GM-002': { flow_rate: 25, pressure: 0.40, temperature: 20, total_volume: 80000 },
  'WM-001': { flow_rate: 8, pressure: 0.30, total_volume: 95000 },
  'SM-001': { flow_rate: 5, pressure: 0.80, temperature: 175, total_mass: 3000 },
}

function generateReading(baseValue: number, variation: number): number {
  return baseValue + (Math.random() - 0.5) * 2 * baseValue * variation
}

function generateElectricityPoint(device: DeviceConfig): Point {
  const base = deviceBaseValues[device.id] || { voltage: 380, current: 100, active_power: 65, total_energy: 100000 }
  const point = new Point('meter_reading')
    .tag('device_id', device.id)
    .tag('energy_type', 'electricity')
    .tag('area_id', device.area_id)
    .tag('protocol', 'mqtt')
    .floatField('voltage', generateReading(base.voltage, 0.02))
    .floatField('current', generateReading(base.current, 0.15))
    .floatField('active_power', generateReading(base.active_power, 0.15))
    .floatField('reactive_power', generateReading(base.active_power * 0.15, 0.2))
    .floatField('power_factor', generateReading(0.92, 0.03))
    .floatField('frequency', generateReading(50.0, 0.002))
    .floatField('total_energy', base.total_energy + Math.random() * 0.5)

  // Increment total energy
  base.total_energy += Math.random() * 0.5
  return point
}

function generateGasPoint(device: DeviceConfig): Point {
  const base = deviceBaseValues[device.id] || { flow_rate: 15, pressure: 0.35, temperature: 22, total_volume: 50000 }
  const point = new Point('meter_reading')
    .tag('device_id', device.id)
    .tag('energy_type', 'gas')
    .tag('area_id', device.area_id)
    .tag('protocol', 'mqtt')
    .floatField('flow_rate', generateReading(base.flow_rate, 0.1))
    .floatField('pressure', generateReading(base.pressure, 0.05))
    .floatField('temperature', generateReading(base.temperature, 0.05))
    .floatField('total_volume', base.total_volume + Math.random() * 0.01)

  base.total_volume += Math.random() * 0.01
  return point
}

function generateWaterPoint(device: DeviceConfig): Point {
  const base = deviceBaseValues[device.id] || { flow_rate: 8, pressure: 0.30, total_volume: 95000 }
  const point = new Point('meter_reading')
    .tag('device_id', device.id)
    .tag('energy_type', 'water')
    .tag('area_id', device.area_id)
    .tag('protocol', 'mqtt')
    .floatField('flow_rate', generateReading(base.flow_rate, 0.12))
    .floatField('pressure', generateReading(base.pressure, 0.05))
    .floatField('total_volume', base.total_volume + Math.random() * 0.005)

  base.total_volume += Math.random() * 0.005
  return point
}

function generateSteamPoint(device: DeviceConfig): Point {
  const base = deviceBaseValues[device.id] || { flow_rate: 5, pressure: 0.80, temperature: 175, total_mass: 3000 }
  const point = new Point('meter_reading')
    .tag('device_id', device.id)
    .tag('energy_type', 'steam')
    .tag('area_id', device.area_id)
    .tag('protocol', 'mqtt')
    .floatField('flow_rate', generateReading(base.flow_rate, 0.1))
    .floatField('pressure', generateReading(base.pressure, 0.05))
    .floatField('temperature', generateReading(base.temperature, 0.03))
    .floatField('total_mass', base.total_mass + Math.random() * 0.01)

  base.total_mass += Math.random() * 0.01
  return point
}

let simulatorInterval: ReturnType<typeof setInterval> | null = null

export function startDataSimulator(): void {
  const db = getDatabase()
  const config = db.prepare("SELECT value FROM system_config WHERE key = 'data_simulator_enabled'").get() as any
  if (config?.value !== 'true') {
    logger.info('Data simulator is disabled')
    return
  }

  const devices = db.prepare("SELECT id, energy_type, area_id, scope FROM devices WHERE status = 'online'").all() as DeviceConfig[]

  if (devices.length === 0) {
    logger.warn('No online devices found for simulation')
    return
  }

  logger.info(`Data simulator started — ${devices.length} devices`)

  simulatorInterval = setInterval(async () => {
    try {
      const writeApi = getWriteApi(BUCKETS.ENERGY_REALTIME)

      for (const device of devices) {
        let point: Point
        switch (device.energy_type) {
          case 'electricity': point = generateElectricityPoint(device); break
          case 'gas': point = generateGasPoint(device); break
          case 'water': point = generateWaterPoint(device); break
          case 'steam': point = generateSteamPoint(device); break
          default: continue
        }

        writeApi.writePoint(point)

        // Emit via Socket.IO
        const base = deviceBaseValues[device.id]
        if (base) {
          emitEnergyData({
            deviceId: device.id,
            energyType: device.energy_type,
            areaId: device.area_id,
            timestamp: new Date().toISOString(),
            data: { ...base },
          })
        }
      }

      await writeApi.flush()

      // Emit device statuses
      emitDeviceStatus(devices.map(d => ({ deviceId: d.id, status: 'online', lastSeen: new Date().toISOString() })))
    } catch (error) {
      logger.debug('Simulator write error (InfluxDB may be unavailable):', error)
    }
  }, 10000) // Every 10 seconds
}

export function stopDataSimulator(): void {
  if (simulatorInterval) {
    clearInterval(simulatorInterval)
    simulatorInterval = null
    logger.info('Data simulator stopped')
  }
}
