import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`${req.method} ${req.path} - ${err.message}`, { stack: err.stack })

  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    code: statusCode,
    message: err.message || '服务器内部错误',
  })
}
