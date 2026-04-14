import { InfluxDB, WriteApi, QueryApi } from '@influxdata/influxdb-client'
import { logger } from '../utils/logger'

const url = process.env.INFLUXDB_URL || 'http://localhost:8086'
const token = process.env.INFLUXDB_TOKEN || ''
const org = process.env.INFLUXDB_ORG || 'carbon-system'

export const BUCKETS = {
  ENERGY_REALTIME: 'energy_realtime',
  ENERGY_HOURLY: 'energy_hourly',
  ENERGY_DAILY: 'energy_daily',
  CARBON_EMISSIONS: 'carbon_emissions',
  DEVICE_STATUS: 'device_status',
} as const

let influxDB: InfluxDB
let writeApis: Map<string, WriteApi> = new Map()
let queryApi: QueryApi

export function getInfluxDB(): InfluxDB {
  if (!influxDB) {
    influxDB = new InfluxDB({ url, token })
  }
  return influxDB
}

export function getWriteApi(bucket: string): WriteApi {
  if (!writeApis.has(bucket)) {
    const api = getInfluxDB().getWriteApi(org, bucket, 's')
    writeApis.set(bucket, api)
  }
  return writeApis.get(bucket)!
}

export function getQueryApi(): QueryApi {
  if (!queryApi) {
    queryApi = getInfluxDB().getQueryApi(org)
  }
  return queryApi
}

export async function initializeInfluxDB(): Promise<void> {
  try {
    // Verify connection by running a simple query
    const queryApi = getQueryApi()
    await new Promise<void>((resolve, reject) => {
      queryApi.queryRows('buckets()', {
        next: () => {},
        error: (err) => reject(err),
        complete: () => resolve(),
      })
    })
    logger.info('InfluxDB connected successfully')
  } catch (error) {
    logger.error('Failed to connect to InfluxDB:', error)
    logger.warn('InfluxDB is not available — data will not be persisted')
  }
}

export async function closeInfluxDB(): Promise<void> {
  for (const [bucket, api] of writeApis) {
    try {
      await api.close()
      logger.info(`InfluxDB write API closed for bucket: ${bucket}`)
    } catch (error) {
      logger.error(`Error closing write API for ${bucket}:`, error)
    }
  }
  writeApis.clear()
}
