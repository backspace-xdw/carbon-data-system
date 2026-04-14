import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    username: string
    role: string
  }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  // Dev bypass
  if (process.env.NODE_ENV === 'development' && !req.headers.authorization) {
    req.user = { userId: 'dev-user', username: 'admin', role: 'super_admin' }
    return next()
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '未提供认证令牌' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
    req.user = { userId: decoded.userId, username: decoded.username, role: decoded.role }
    next()
  } catch {
    res.status(401).json({ code: 401, message: '认证令牌无效或已过期' })
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ code: 401, message: '未认证' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ code: 403, message: '权限不足' })
      return
    }
    next()
  }
}
