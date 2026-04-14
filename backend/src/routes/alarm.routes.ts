import { Router } from 'express'
import { alarmController } from '../controllers/alarm.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()

router.get('/', authenticate, alarmController.list)
router.get('/stats', authenticate, alarmController.stats)
router.put('/:id/acknowledge', authenticate, alarmController.acknowledge)
router.put('/:id/resolve', authenticate, alarmController.resolve)
router.get('/rules', authenticate, alarmController.listRules)

export default router
