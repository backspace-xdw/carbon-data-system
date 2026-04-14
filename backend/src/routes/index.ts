import { Router } from 'express'
import authRoutes from './auth.routes'
import dashboardRoutes from './dashboard.routes'
import deviceRoutes from './device.routes'
import dataRoutes from './data.routes'
import carbonRoutes from './carbon.routes'
import alarmRoutes from './alarm.routes'
import emissionFactorRoutes from './emissionFactor.routes'
import systemRoutes from './system.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/devices', deviceRoutes)
router.use('/data', dataRoutes)
router.use('/carbon', carbonRoutes)
router.use('/alarms', alarmRoutes)
router.use('/emission-factors', emissionFactorRoutes)
router.use('/system', systemRoutes)

export default router
