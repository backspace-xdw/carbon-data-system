import { Router } from 'express'
import { systemController } from '../controllers/system.controller'
import { authenticate, authorize } from '../middleware/authenticate'

const router = Router()

router.get('/areas', authenticate, systemController.listAreas)
router.post('/areas', authenticate, authorize('super_admin', 'admin'), systemController.createArea)
router.put('/areas/:id', authenticate, authorize('super_admin', 'admin'), systemController.updateArea)
router.delete('/areas/:id', authenticate, authorize('super_admin', 'admin'), systemController.deleteArea)
router.get('/config', authenticate, systemController.getConfig)
router.put('/config', authenticate, authorize('super_admin', 'admin'), systemController.updateConfig)
router.get('/energy-prices', authenticate, systemController.getEnergyPrices)

export default router
