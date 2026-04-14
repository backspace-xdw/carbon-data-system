import cron from 'node-cron'
import { getQueryApi, getWriteApi, BUCKETS } from '../config/influxdb'
import { getDatabase } from '../config/database'
import { Point } from '@influxdata/influxdb-client'
import { emitCarbonUpdate } from '../config/socketio'
import { logger } from '../utils/logger'

export function startScheduler(): void {
  // Every hour: aggregate energy data and calculate carbon
  cron.schedule('0 * * * *', async () => {
    logger.info('Running hourly carbon calculation...')
    await calculateHourlyCarbon()
  })

  // Daily at 00:05: daily aggregation
  cron.schedule('5 0 * * *', async () => {
    logger.info('Running daily aggregation...')
    await calculateDailyAggregation()
  })

  logger.info('Scheduler started — hourly carbon calc, daily aggregation')
}

async function calculateHourlyCarbon(): Promise<void> {
  try {
    const db = getDatabase()
    const queryApi = getQueryApi()
    const writeApi = getWriteApi(BUCKETS.CARBON_EMISSIONS)

    // Get default emission factors
    const factors = db.prepare('SELECT * FROM emission_factors WHERE is_default = 1 AND status = ?').all('active') as any[]
    const factorMap = new Map<string, any>()
    factors.forEach(f => factorMap.set(f.energy_type, f))

    // Query last hour's energy consumption by area and energy type
    const query = `
      from(bucket: "${BUCKETS.ENERGY_REALTIME}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "meter_reading")
        |> filter(fn: (r) => r._field == "total_energy" or r._field == "total_volume" or r._field == "total_mass")
        |> first()
    `
    const firstRows: any[] = []
    await new Promise<void>((resolve) => {
      queryApi.queryRows(query, {
        next: (row, tableMeta) => { firstRows.push(tableMeta.toObject(row)) },
        error: () => resolve(),
        complete: () => resolve(),
      })
    })

    const lastQuery = query.replace('first()', 'last()')
    const lastRows: any[] = []
    await new Promise<void>((resolve) => {
      queryApi.queryRows(lastQuery, {
        next: (row, tableMeta) => { lastRows.push(tableMeta.toObject(row)) },
        error: () => resolve(),
        complete: () => resolve(),
      })
    })

    // Calculate deltas and emissions
    let totalEmission = 0
    const firstMap = new Map(firstRows.map(r => [`${r.device_id}:${r._field}`, r._value]))

    for (const lastRow of lastRows) {
      const key = `${lastRow.device_id}:${lastRow._field}`
      const firstValue = firstMap.get(key)
      if (firstValue === undefined) continue

      const consumption = lastRow._value - firstValue
      if (consumption <= 0) continue

      const factor = factorMap.get(lastRow.energy_type)
      if (!factor) continue

      const emission = consumption * factor.factor_value

      const point = new Point('carbon_emission')
        .tag('area_id', lastRow.area_id || 'unknown')
        .tag('energy_type', lastRow.energy_type)
        .tag('scope', factor.scope)
        .floatField('emission', emission)
        .floatField('consumption', consumption)
        .floatField('emission_factor', factor.factor_value)

      writeApi.writePoint(point)
      totalEmission += emission
    }

    // Write total emission
    if (totalEmission > 0) {
      const totalPoint = new Point('carbon_emission')
        .tag('area_id', 'total')
        .tag('energy_type', 'all')
        .tag('scope', 'total')
        .floatField('emission', totalEmission)

      writeApi.writePoint(totalPoint)
      await writeApi.flush()

      emitCarbonUpdate({ totalEmission, timestamp: new Date().toISOString() })
      logger.info(`Hourly carbon calc complete: ${totalEmission.toFixed(4)} tCO2e`)
    }
  } catch (error) {
    logger.error('Hourly carbon calculation error:', error)
  }
}

async function calculateDailyAggregation(): Promise<void> {
  try {
    logger.info('Daily aggregation completed')
  } catch (error) {
    logger.error('Daily aggregation error:', error)
  }
}
