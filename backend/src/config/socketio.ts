import { Server, Socket } from 'socket.io'
import { logger } from '../utils/logger'

let io: Server

export function initializeSocketIO(socketServer: Server): void {
  io = socketServer

  io.on('connection', (socket: Socket) => {
    logger.debug(`Client connected: ${socket.id}`)

    socket.on('subscribe:energy', (payload?: { energyTypes?: string[]; areaIds?: string[] }) => {
      socket.join('energy:realtime')
      if (payload?.areaIds) {
        payload.areaIds.forEach(id => socket.join(`energy:area:${id}`))
      }
    })

    socket.on('unsubscribe:energy', () => {
      socket.leave('energy:realtime')
    })

    socket.on('subscribe:alarms', () => {
      socket.join('alarms:all')
    })

    socket.on('subscribe:dashboard', () => {
      socket.join('dashboard')
    })

    socket.on('disconnect', () => {
      logger.debug(`Client disconnected: ${socket.id}`)
    })
  })

  logger.info('Socket.IO initialized')
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized')
  }
  return io
}

export function emitEnergyData(data: any): void {
  if (io) {
    io.to('energy:realtime').emit('energy:realtime', data)
    if (data.areaId) {
      io.to(`energy:area:${data.areaId}`).emit('energy:realtime', data)
    }
  }
}

export function emitCarbonUpdate(data: any): void {
  if (io) {
    io.to('dashboard').emit('carbon:update', data)
  }
}

export function emitAlarm(data: any): void {
  if (io) {
    io.to('alarms:all').emit('alarm:new', data)
  }
}

export function emitDeviceStatus(data: any): void {
  if (io) {
    io.to('energy:realtime').emit('device:status', data)
  }
}
