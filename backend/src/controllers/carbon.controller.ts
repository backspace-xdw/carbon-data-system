import { Request, Response } from 'express'
import { getQueryApi, BUCKETS } from '../config/influxdb'
import { getDatabase } from '../config/database'
import { logger } from '../utils/logger'

export const carbonController = {
  async summary(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase()
      const currentYear = new Date().getFullYear()
      const quota = db.prepare('SELECT quota_total FROM carbon_quotas WHERE year = ? AND area_id IS NULL').get(currentYear) as any

      // Get emission factors for scope breakdown
      const factors = db.prepare('SELECT energy_type, scope FROM emission_factors WHERE is_default = 1').all() as any[]

      const scopeBreakdown = [
        { scope: 'scope1', label: '直接排放(范围一)', emission: 0, percentage: 0 },
        { scope: 'scope2', label: '间接排放(范围二)', emission: 0, percentage: 0 },
        { scope: 'scope3', label: '其他间接排放(范围三)', emission: 0, percentage: 0 },
      ]

      const energyBreakdown = [
        { energyType: 'electricity', label: '电力', emission: 0, percentage: 0 },
        { energyType: 'gas', label: '天然气', emission: 0, percentage: 0 },
        { energyType: 'steam', label: '蒸汽', emission: 0, percentage: 0 },
        { energyType: 'water', label: '自来水', emission: 0, percentage: 0 },
      ]

      res.json({
        code: 0,
        message: 'success',
        data: {
          totalEmission: 0,
          quota: quota?.quota_total || 0,
          quotaUsage: 0,
          scopeBreakdown,
          energyBreakdown,
        },
      })
    } catch (error) {
      logger.error('Carbon summary error:', error)
      res.status(500).json({ code: 500, message: '获取碳排放汇总失败' })
    }
  },

  async trend(req: Request, res: Response): Promise<void> {
    const { period = 'monthly', year = new Date().getFullYear(), areaId } = req.query
    try {
      const queryApi = getQueryApi()
      const areaFilter = areaId ? `and r.area_id == "${areaId}"` : 'and r.area_id == "total"'
      const query = `
        from(bucket: "${BUCKETS.CARBON_EMISSIONS}")
          |> range(start: ${year}-01-01T00:00:00Z, stop: ${Number(year) + 1}-01-01T00:00:00Z)
          |> filter(fn: (r) => r._measurement == "carbon_emission" ${areaFilter})
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

      res.json({
        code: 0,
        message: 'success',
        data: { timestamps: rows.map(r => r._time), values: rows.map(r => r._value || 0) },
      })
    } catch {
      res.json({ code: 0, message: 'success', data: { timestamps: [], values: [] } })
    }
  },

  async quotaStatus(req: Request, res: Response): Promise<void> {
    const year = Number(req.query.year) || new Date().getFullYear()
    const db = getDatabase()
    const quota = db.prepare('SELECT * FROM carbon_quotas WHERE year = ? AND area_id IS NULL').get(year) as any

    res.json({
      code: 0,
      message: 'success',
      data: {
        year,
        annualQuota: quota?.quota_total || 0,
        used: 0,
        remaining: quota?.quota_total || 0,
        monthlyQuota: quota ? quota.quota_total / 12 : 0,
      },
    })
  },
}
