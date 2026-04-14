import { Request, Response } from 'express'
import { getQueryApi, BUCKETS } from '../config/influxdb'
import { getDatabase } from '../config/database'
import { logger } from '../utils/logger'

export const dashboardController = {
  async overview(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase()

      // Get device summary
      const devices = db.prepare(`
        SELECT status, COUNT(*) as count FROM devices GROUP BY status
      `).all() as any[]
      const deviceSummary = {
        total: devices.reduce((sum: number, d: any) => sum + d.count, 0),
        online: devices.find((d: any) => d.status === 'online')?.count || 0,
        offline: devices.find((d: any) => d.status === 'offline')?.count || 0,
        warning: devices.find((d: any) => d.status === 'warning')?.count || 0,
      }

      // Get alarm summary
      const alarms = db.prepare(`
        SELECT severity, COUNT(*) as count FROM alarm_records WHERE status = 'active' GROUP BY severity
      `).all() as any[]
      const alarmSummary = {
        active: alarms.reduce((sum: number, a: any) => sum + a.count, 0),
        critical: alarms.find((a: any) => a.severity === 'critical')?.count || 0,
        warning: alarms.find((a: any) => a.severity === 'warning')?.count || 0,
      }

      // Get current year quota
      const currentYear = new Date().getFullYear()
      const quota = db.prepare('SELECT quota_total FROM carbon_quotas WHERE year = ? AND area_id IS NULL').get(currentYear) as any

      // Try to get carbon data from InfluxDB
      let carbonEmission = { today: 0, thisMonth: 0, thisYear: 0, quota: quota?.quota_total || 0, quotaUsagePct: 0 }
      try {
        const queryApi = getQueryApi()
        const yearQuery = `
          from(bucket: "${BUCKETS.CARBON_EMISSIONS}")
            |> range(start: ${currentYear}-01-01T00:00:00Z)
            |> filter(fn: (r) => r._measurement == "carbon_emission" and r.area_id == "total")
            |> filter(fn: (r) => r._field == "emission")
            |> sum()
        `
        const rows: any[] = []
        await new Promise<void>((resolve) => {
          queryApi.queryRows(yearQuery, {
            next: (row, tableMeta) => { rows.push(tableMeta.toObject(row)) },
            error: () => resolve(),
            complete: () => resolve(),
          })
        })
        if (rows.length > 0) {
          carbonEmission.thisYear = rows[0]._value || 0
          carbonEmission.quotaUsagePct = quota ? (carbonEmission.thisYear / quota.quota_total) * 100 : 0
        }
      } catch {
        // InfluxDB may not be available
      }

      res.json({
        code: 0,
        message: 'success',
        data: { carbonEmission, deviceSummary, alarmSummary },
      })
    } catch (error) {
      logger.error('Dashboard overview error:', error)
      res.status(500).json({ code: 500, message: '获取总览数据失败' })
    }
  },

  async carbonTrend(req: Request, res: Response): Promise<void> {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query
    try {
      const queryApi = getQueryApi()
      const query = `
        from(bucket: "${BUCKETS.CARBON_EMISSIONS}")
          |> range(start: ${year}-01-01T00:00:00Z, stop: ${Number(year) + 1}-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "carbon_emission" and r.area_id == "total")
          |> filter(fn: (r) => r._field == "emission")
          |> aggregateWindow(every: 1mo, fn: sum, createEmpty: true)
      `
      const rows: any[] = []
      await new Promise<void>((resolve) => {
        queryApi.queryRows(query, {
          next: (row, tableMeta) => { rows.push(tableMeta.toObject(row)) },
          error: () => resolve(),
          complete: () => resolve(),
        })
      })

      const db = getDatabase()
      const quota = db.prepare('SELECT quota_total FROM carbon_quotas WHERE year = ?').get(Number(year)) as any
      const monthlyQuota = quota ? quota.quota_total / 12 : 0

      res.json({
        code: 0,
        message: 'success',
        data: {
          period,
          months: rows.map(r => r._time),
          emission: rows.map(r => r._value || 0),
          quota: rows.map(() => monthlyQuota),
        },
      })
    } catch (error) {
      logger.error('Carbon trend error:', error)
      res.json({ code: 0, message: 'success', data: { months: [], emission: [], quota: [] } })
    }
  },

  async areaBreakdown(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase()
      const areas = db.prepare('SELECT id, name FROM areas').all() as any[]

      res.json({
        code: 0,
        message: 'success',
        data: areas.map(a => ({
          areaId: a.id,
          areaName: a.name,
          electricity: 0,
          gas: 0,
          water: 0,
          steam: 0,
          carbonEmission: 0,
        })),
      })
    } catch (error) {
      logger.error('Area breakdown error:', error)
      res.status(500).json({ code: 500, message: '获取区域数据失败' })
    }
  },
}
