import Router from 'express';
import authRoutes from './auth.routes';
import cashierRoutes from './cashier.routes';
import productRoutes from './product.routes';
import promoRoutes from './promo.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/cashiers', cashierRoutes);
router.use('/products', productRoutes);
router.use('/promos', promoRoutes);
router.use('/upload', uploadRoutes);

export default router;
