import { Request, Response, NextFunction } from 'express'

const requestCounts = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS = 1000
const WINDOW_MS = 60 * 1000

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || 'unknown'
  const now = Date.now()
  const record = requestCounts.get(ip)

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return next()
  }

  record.count++
  if (record.count > MAX_REQUESTS) {
    res.status(429).json({ code: 429, message: '请求过于频繁' })
    return
  }
  next()
}
