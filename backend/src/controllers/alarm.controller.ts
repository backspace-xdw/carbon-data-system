import { Request, Response } from 'express'
import { getDatabase } from '../config/database'
import { AuthRequest } from '../middleware/authenticate'

export const alarmController = {
  list(req: Request, res: Response): void {
    const { status, severity, category, page = '1', pageSize = '20' } = req.query
    const db = getDatabase()
    let where = 'WHERE 1=1'
    const params: any[] = []

    if (status) { where += ' AND ar.status = ?'; params.push(status) }
    if (severity) { where += ' AND ar.severity = ?'; params.push(severity) }
    if (category) { where += ' AND rl.category = ?'; params.push(category) }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM alarm_records ar
      LEFT JOIN alarm_rules rl ON ar.rule_id = rl.id ${where}
    `).get(...params) as any

    const offset = (Number(page) - 1) * Number(pageSize)
    const rows = db.prepare(`
      SELECT ar.*, rl.name as rule_name, rl.category
      FROM alarm_records ar LEFT JOIN alarm_rules rl ON ar.rule_id = rl.id
      ${where} ORDER BY ar.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), offset)

    res.json({ code: 0, message: 'success', data: rows, total: total.count, page: Number(page), pageSize: Number(pageSize) })
  },

  stats(_req: Request, res: Response): void {
    const db = getDatabase()
    const stats = db.prepare(`
      SELECT status, severity, COUNT(*) as count FROM alarm_records GROUP BY status, severity
    `).all()
    res.json({ code: 0, message: 'success', data: stats })
  },

  acknowledge(req: AuthRequest, res: Response): void {
    const db = getDatabase()
    db.prepare(`
      UPDATE alarm_records SET status = 'acknowledged', acknowledged_at = datetime('now'), acknowledged_by = ?, note = ?
      WHERE id = ?
    `).run(req.user?.username, req.body.note || '', req.params.id)
    res.json({ code: 0, message: '告警已确认' })
  },

  resolve(req: AuthRequest, res: Response): void {
    const db = getDatabase()
    db.prepare(`
      UPDATE alarm_records SET status = 'resolved', resolved_at = datetime('now'), resolved_by = ?, note = ?
      WHERE id = ?
    `).run(req.user?.username, req.body.note || '', req.params.id)
    res.json({ code: 0, message: '告警已解除' })
  },

  // Alarm Rules
  listRules(_req: Request, res: Response): void {
    const db = getDatabase()
    const rules = db.prepare('SELECT * FROM alarm_rules ORDER BY created_at DESC').all()
    res.json({ code: 0, message: 'success', data: rules })
  },
}
