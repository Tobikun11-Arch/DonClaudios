import Router from 'express';
import authRoutes from './auth.routes';
import cashierRoutes from './cashier.routes';
import productRoutes from './product.routes';
import promoRoutes from './promo.routes';
import uploadRoutes from './upload.routes';
import cartRoutes from './cart.routes';
import orderRoutes from './order.routes';
import stockMovementRoutes from './stockMovement.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/cashiers', cashierRoutes);
router.use('/products', productRoutes);
router.use('/promos', promoRoutes);
router.use('/upload', uploadRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/inventory', stockMovementRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
