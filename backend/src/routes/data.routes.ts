import { Router } from 'express'
import { dataController } from '../controllers/data.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()

router.get('/realtime', authenticate, dataController.realtime)
router.get('/consumption', authenticate, dataController.consumption)
router.post('/manual-input', authenticate, dataController.manualInput)

export default router
