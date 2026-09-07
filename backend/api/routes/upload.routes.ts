import {Router} from 'express';
import multer from 'multer';
import {uploadController} from '../controllers/upload.controller';
import {requireAdmin, requireAuth, requireCustomer} from '../middleware/auth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.post(
  '/product-image',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  uploadController.uploadProductImage
);

router.post(
  '/promo-image',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  uploadController.uploadPromoImage
);

router.post(
  '/profile-image',
  requireAuth,
  upload.single('file'),
  uploadController.uploadProfileImage
);

router.post(
  '/section-image',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  uploadController.uploadSectionImage
);

router.post(
  '/review-image',
  requireAuth,
  requireCustomer,
  upload.single('file'),
  uploadController.uploadReviewImage
);

export default router;
