import { Router } from 'express'
import { deviceController } from '../controllers/device.controller'
import { authenticate, authorize } from '../middleware/authenticate'

const router = Router()

router.get('/', authenticate, deviceController.list)
router.get('/:id', authenticate, deviceController.getById)
router.post('/', authenticate, authorize('super_admin', 'admin'), deviceController.create)
router.put('/:id', authenticate, authorize('super_admin', 'admin'), deviceController.update)
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), deviceController.delete)

export default router
