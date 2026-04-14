import { Request, Response } from 'express'
import { getQueryApi, getWriteApi, BUCKETS } from '../config/influxdb'
import { Point } from '@influxdata/influxdb-client'
import { logger } from '../utils/logger'

export const dataController = {
  async realtime(req: Request, res: Response): Promise<void> {
    const { energyType, areaId } = req.query
    try {
      const queryApi = getQueryApi()
      let filters = 'r._measurement == "meter_reading"'
      if (energyType) filters += ` and r.energy_type == "${energyType}"`
      if (areaId) filters += ` and r.area_id == "${areaId}"`

      const query = `
        from(bucket: "${BUCKETS.ENERGY_REALTIME}")
          |> range(start: -5m)
          |> filter(fn: (r) => ${filters})
          |> last()
      `
      const rows: any[] = []
      await new Promise<void>((resolve) => {
        queryApi.queryRows(query, {
          next: (row, tableMeta) => { rows.push(tableMeta.toObject(row)) },
          error: () => resolve(),
          complete: () => resolve(),
        })
      })

      // Group by device_id
      const grouped = new Map<string, any>()
      for (const row of rows) {
        const deviceId = row.device_id
        if (!grouped.has(deviceId)) {
          grouped.set(deviceId, { deviceId, energyType: row.energy_type, areaId: row.area_id, timestamp: row._time, data: {} })
        }
        grouped.get(deviceId)!.data[row._field] = row._value
      }

      res.json({ code: 0, message: 'success', data: Array.from(grouped.values()) })
    } catch {
      res.json({ code: 0, message: 'success', data: [] })
    }
  },

  async consumption(req: Request, res: Response): Promise<void> {
    const { energyType, areaId, period = 'hourly', startDate, endDate } = req.query
    const bucket = period === 'daily' ? BUCKETS.ENERGY_DAILY : BUCKETS.ENERGY_HOURLY
    const start = startDate || '-7d'
    const stop = endDate ? `, stop: ${endDate}` : ''

    try {
      const queryApi = getQueryApi()
      let filters = 'r._measurement == "energy_consumption"'
      if (energyType) filters += ` and r.energy_type == "${energyType}"`
      if (areaId) filters += ` and r.area_id == "${areaId}"`

      const query = `
        from(bucket: "${bucket}")
          |> range(start: ${start}${stop})
          |> filter(fn: (r) => ${filters})
          |> filter(fn: (r) => r._field == "consumption")
      `
      const rows: any[] = []
      await new Promise<void>((resolve) => {
        queryApi.queryRows(query, {
          next: (row, tableMeta) => { rows.push(tableMeta.toObject(row)) },
          error: () => resolve(),
          complete: () => resolve(),
        })
      })

      res.json({
        code: 0,
        message: 'success',
        data: { timestamps: rows.map(r => r._time), values: rows.map(r => r._value) },
      })
    } catch {
      res.json({ code: 0, message: 'success', data: { timestamps: [], values: [] } })
    }
  },

  async manualInput(req: Request, res: Response): Promise<void> {
    const { deviceId, energyType, timestamp, readings } = req.body
    if (!deviceId || !energyType || !readings) {
      res.status(400).json({ code: 400, message: '缺少必要参数' })
      return
    }

    try {
      const writeApi = getWriteApi(BUCKETS.ENERGY_REALTIME)
      const point = new Point('meter_reading')
        .tag('device_id', deviceId)
        .tag('energy_type', energyType)
        .tag('protocol', 'manual')
        .timestamp(timestamp ? new Date(timestamp) : new Date())

      for (const [key, value] of Object.entries(readings)) {
        point.floatField(key, Number(value))
      }

      writeApi.writePoint(point)
      await writeApi.flush()

      res.json({ code: 0, message: '数据录入成功' })
    } catch (error) {
      logger.error('Manual input error:', error)
      res.status(500).json({ code: 500, message: '数据录入失败' })
    }
  },
}
