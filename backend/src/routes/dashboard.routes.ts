import { Router } from 'express'
import { dashboardController } from '../controllers/dashboard.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()

router.get('/overview', authenticate, dashboardController.overview)
router.get('/carbon-trend', authenticate, dashboardController.carbonTrend)
router.get('/area-breakdown', authenticate, dashboardController.areaBreakdown)

export default router
