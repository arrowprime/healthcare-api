import { Router } from 'express';
import { create, list, getById, updateStatus, remove } from '../controllers/appointments.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate as any);

router.post('/',               authorize('patient') as any, create as any);
router.get('/',                list as any);
router.get('/:id',             getById as any);
router.patch('/:id/status',    authorize('doctor', 'admin') as any, updateStatus as any);
router.delete('/:id',          remove as any);

export default router;
