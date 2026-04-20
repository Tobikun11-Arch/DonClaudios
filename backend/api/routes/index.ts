import Router from 'express';
import authRoutes from './auth.routes';
import cashierRoutes from './cashier.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/cashiers', cashierRoutes);

export default router;
