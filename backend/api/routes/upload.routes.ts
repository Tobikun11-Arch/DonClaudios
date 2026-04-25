import {Router} from 'express';
import multer from 'multer';
import {uploadController} from '../controllers/upload.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';

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

export default router;
