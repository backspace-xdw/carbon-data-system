import { Request, Response } from 'express'
import { getDatabase } from '../config/database'
import { v4 as uuidv4 } from 'uuid'

export const systemController = {
  // Areas
  listAreas(_req: Request, res: Response): void {
    const db = getDatabase()
    const areas = db.prepare('SELECT * FROM areas ORDER BY sort_order').all()
    res.json({ code: 0, message: 'success', data: areas })
  },

  createArea(req: Request, res: Response): void {
    const { id, name, parent_id, type, description, sort_order } = req.body
    const db = getDatabase()
    const areaId = id || `area-${uuidv4().slice(0, 8)}`
    db.prepare('INSERT INTO areas (id, name, parent_id, type, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(areaId, name, parent_id, type || 'production', description, sort_order || 0)
    res.json({ code: 0, message: '区域创建成功', data: { id: areaId } })
  },

  updateArea(req: Request, res: Response): void {
    const { name, type, description, sort_order } = req.body
    const db = getDatabase()
    db.prepare('UPDATE areas SET name = COALESCE(?, name), type = COALESCE(?, type), description = COALESCE(?, description), sort_order = COALESCE(?, sort_order) WHERE id = ?')
      .run(name, type, description, sort_order, req.params.id)
    res.json({ code: 0, message: '区域更新成功' })
  },

  deleteArea(req: Request, res: Response): void {
    getDatabase().prepare('DELETE FROM areas WHERE id = ?').run(req.params.id)
    res.json({ code: 0, message: '区域已删除' })
  },

  // Config
  getConfig(_req: Request, res: Response): void {
    const db = getDatabase()
    const configs = db.prepare('SELECT * FROM system_config').all() as any[]
    const configMap: Record<string, string> = {}
    configs.forEach(c => { configMap[c.key] = c.value })
    res.json({ code: 0, message: 'success', data: configMap })
  },

  updateConfig(req: Request, res: Response): void {
    const db = getDatabase()
    const upsert = db.prepare("INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    for (const [key, value] of Object.entries(req.body)) {
      upsert.run(key, String(value))
    }
    res.json({ code: 0, message: '配置更新成功' })
  },

  // Energy Prices
  getEnergyPrices(_req: Request, res: Response): void {
    const db = getDatabase()
    const prices = db.prepare('SELECT * FROM energy_prices ORDER BY energy_type').all()
    res.json({ code: 0, message: 'success', data: prices })
  },
}
