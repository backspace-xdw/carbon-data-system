import { Request, Response } from 'express'
import { getDatabase } from '../config/database'
import { v4 as uuidv4 } from 'uuid'

export const deviceController = {
  list(req: Request, res: Response): void {
    const { energyType, areaId, status, page = '1', pageSize = '20' } = req.query
    const db = getDatabase()
    let where = 'WHERE 1=1'
    const params: any[] = []

    if (energyType) { where += ' AND d.energy_type = ?'; params.push(energyType) }
    if (areaId) { where += ' AND d.area_id = ?'; params.push(areaId) }
    if (status) { where += ' AND d.status = ?'; params.push(status) }

    const total = db.prepare(`SELECT COUNT(*) as count FROM devices d ${where}`).get(...params) as any
    const offset = (Number(page) - 1) * Number(pageSize)
    const rows = db.prepare(`
      SELECT d.*, a.name as area_name
      FROM devices d LEFT JOIN areas a ON d.area_id = a.id
      ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), offset)

    res.json({ code: 0, message: 'success', data: rows, total: total.count, page: Number(page), pageSize: Number(pageSize) })
  },

  getById(req: Request, res: Response): void {
    const db = getDatabase()
    const device = db.prepare(`
      SELECT d.*, a.name as area_name
      FROM devices d LEFT JOIN areas a ON d.area_id = a.id
      WHERE d.id = ?
    `).get(req.params.id)

    if (!device) {
      res.status(404).json({ code: 404, message: '设备不存在' })
      return
    }
    res.json({ code: 0, message: 'success', data: device })
  },

  create(req: Request, res: Response): void {
    const { id, name, energy_type, protocol, area_id, scope, manufacturer, model, serial_number, connection_config } = req.body
    const db = getDatabase()
    const deviceId = id || `${energy_type?.charAt(0).toUpperCase()}M-${uuidv4().slice(0, 3).toUpperCase()}`

    db.prepare(`
      INSERT INTO devices (id, name, energy_type, protocol, area_id, scope, manufacturer, model, serial_number, connection_config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(deviceId, name, energy_type, protocol, area_id, scope || 'scope2', manufacturer, model, serial_number, JSON.stringify(connection_config))

    res.json({ code: 0, message: '设备创建成功', data: { id: deviceId } })
  },

  update(req: Request, res: Response): void {
    const db = getDatabase()
    const fields = ['name', 'energy_type', 'protocol', 'area_id', 'scope', 'manufacturer', 'model', 'status', 'connection_config']
    const updates: string[] = []
    const params: any[] = []

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`)
        params.push(field === 'connection_config' ? JSON.stringify(req.body[field]) : req.body[field])
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ code: 400, message: '没有需要更新的字段' })
      return
    }

    updates.push("updated_at = datetime('now')")
    params.push(req.params.id)
    db.prepare(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    res.json({ code: 0, message: '设备更新成功' })
  },

  delete(req: Request, res: Response): void {
    const db = getDatabase()
    db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id)
    res.json({ code: 0, message: '设备已删除' })
  },
}
