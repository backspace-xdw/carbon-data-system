import { Router } from 'express'
import { carbonController } from '../controllers/carbon.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()

router.get('/summary', authenticate, carbonController.summary)
router.get('/trend', authenticate, carbonController.trend)
router.get('/quota-status', authenticate, carbonController.quotaStatus)

export default router
