import { Request, Response } from 'express'
import { getDatabase } from '../config/database'
import { v4 as uuidv4 } from 'uuid'

export const emissionFactorController = {
  list(req: Request, res: Response): void {
    const { energyType, status = 'active' } = req.query
    const db = getDatabase()
    let where = 'WHERE status = ?'
    const params: any[] = [status]

    if (energyType) { where += ' AND energy_type = ?'; params.push(energyType) }

    const rows = db.prepare(`SELECT * FROM emission_factors ${where} ORDER BY energy_type, is_default DESC`).all(...params)
    res.json({ code: 0, message: 'success', data: rows })
  },

  create(req: Request, res: Response): void {
    const { energy_type, name, factor_value, factor_unit, source_unit, scope, region, source, valid_year, is_default } = req.body
    const db = getDatabase()
    const id = uuidv4()

    if (is_default) {
      db.prepare('UPDATE emission_factors SET is_default = 0 WHERE energy_type = ?').run(energy_type)
    }

    db.prepare(`
      INSERT INTO emission_factors (id, energy_type, name, factor_value, factor_unit, source_unit, scope, region, source, valid_year, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, energy_type, name, factor_value, factor_unit, source_unit, scope, region, source, valid_year, is_default ? 1 : 0)

    res.json({ code: 0, message: '排放因子创建成功', data: { id } })
  },

  update(req: Request, res: Response): void {
    const db = getDatabase()
    const { name, factor_value, is_default, status } = req.body
    const updates: string[] = []
    const params: any[] = []

    if (name) { updates.push('name = ?'); params.push(name) }
    if (factor_value) { updates.push('factor_value = ?'); params.push(factor_value) }
    if (status) { updates.push('status = ?'); params.push(status) }
    if (is_default !== undefined) {
      updates.push('is_default = ?'); params.push(is_default ? 1 : 0)
      if (is_default) {
        const existing = db.prepare('SELECT energy_type FROM emission_factors WHERE id = ?').get(req.params.id) as any
        if (existing) {
          db.prepare('UPDATE emission_factors SET is_default = 0 WHERE energy_type = ? AND id != ?').run(existing.energy_type, req.params.id)
        }
      }
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')")
      params.push(req.params.id)
      db.prepare(`UPDATE emission_factors SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    }

    res.json({ code: 0, message: '排放因子更新成功' })
  },

  delete(req: Request, res: Response): void {
    getDatabase().prepare('DELETE FROM emission_factors WHERE id = ?').run(req.params.id)
    res.json({ code: 0, message: '排放因子已删除' })
  },
}
