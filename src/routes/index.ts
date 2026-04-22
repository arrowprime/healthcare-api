import { Router } from 'express';
import authRoutes        from './auth.routes';
import appointmentRoutes from './appointments.routes';
import doctorRoutes      from './doctors.routes';

const router = Router();

router.use('/auth',         authRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/doctors',      doctorRoutes);

export default router;
