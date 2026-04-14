import { Router } from 'express'
import { emissionFactorController } from '../controllers/emissionFactor.controller'
import { authenticate, authorize } from '../middleware/authenticate'

const router = Router()

router.get('/', authenticate, emissionFactorController.list)
router.post('/', authenticate, authorize('super_admin', 'admin'), emissionFactorController.create)
router.put('/:id', authenticate, authorize('super_admin', 'admin'), emissionFactorController.update)
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), emissionFactorController.delete)

export default router
