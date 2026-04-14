import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimiter'
import routes from './routes'
import { initializeDatabase, closeDatabase } from './config/database'
import { initializeInfluxDB, closeInfluxDB } from './config/influxdb'
import { initializeMQTT, closeMQTT } from './config/mqtt'
import { initializeSocketIO } from './config/socketio'
import { UserModel } from './models/user.model'
import { startDataSimulator } from './services/dataSimulator.service'
import { startScheduler } from './services/scheduler.service'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST'],
  },
})

// Middleware
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }))
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(rateLimiter)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() })
})

// API routes
app.use('/api/v1', routes)

// Socket.IO
initializeSocketIO(io)

// Error handling
app.use(errorHandler)

// Start server
const PORT = process.env.PORT || 50003

async function startServer() {
  try {
    // Initialize databases
    initializeDatabase()
    await initializeInfluxDB()
    await initializeMQTT()

    // Initialize default users
    await UserModel.initialize()
    logger.info('User model initialized')

    // Start data simulator (dev mode)
    startDataSimulator()

    // Start scheduled jobs
    startScheduler()

    httpServer.listen(PORT, () => {
      logger.info(`双碳数据采集系统后端启动 - 端口 ${PORT}`)
      logger.info(`环境: ${process.env.NODE_ENV}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received: shutting down')
  await closeInfluxDB()
  closeMQTT()
  closeDatabase()
  httpServer.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})
