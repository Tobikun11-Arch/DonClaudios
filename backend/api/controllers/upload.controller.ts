import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {
  uploadProductImageBuffer,
  uploadPromoImageBuffer,
  uploadProfileImageBuffer,
  uploadSectionImageBuffer
} from '../services/cloudinary.service';

type MulterRequest = Request & {
  file?: Express.Multer.File;
};

export const uploadController = {
  async uploadProductImage(
    req: MulterRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const file = req.file;
      if (!file) {
        throw new ApiError(400, 'NO_FILE', 'No file uploaded');
      }

      if (!file.mimetype.startsWith('image/')) {
        throw new ApiError(400, 'INVALID_FILE', 'File must be an image');
      }

      const {secureUrl} = await uploadProductImageBuffer({
        buffer: file.buffer,
        filename: file.originalname
      });

      return res.status(200).json({imageUrl: secureUrl});
    } catch (error) {
      next(error);
    }
  },

  async uploadPromoImage(
    req: MulterRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const file = req.file;
      if (!file) {
        throw new ApiError(400, 'NO_FILE', 'No file uploaded');
      }

      if (!file.mimetype.startsWith('image/')) {
        throw new ApiError(400, 'INVALID_FILE', 'File must be an image');
      }

      const {secureUrl} = await uploadPromoImageBuffer({
        buffer: file.buffer,
        filename: file.originalname
      });

      return res.status(200).json({imageUrl: secureUrl});
    } catch (error) {
      next(error);
    }
  },

  async uploadProfileImage(
    req: MulterRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const file = req.file;
      if (!file) {
        throw new ApiError(400, 'NO_FILE', 'No file uploaded');
      }

      if (!file.mimetype.startsWith('image/')) {
        throw new ApiError(400, 'INVALID_FILE', 'File must be an image');
      }

      const {secureUrl} = await uploadProfileImageBuffer({
        buffer: file.buffer,
        filename: file.originalname
      });

      return res.status(200).json({imageUrl: secureUrl});
    } catch (error) {
      next(error);
    }
  },

  async uploadSectionImage(
    req: MulterRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const file = req.file;
      if (!file) {
        throw new ApiError(400, 'NO_FILE', 'No file uploaded');
      }

      if (!file.mimetype.startsWith('image/')) {
        throw new ApiError(400, 'INVALID_FILE', 'File must be an image');
      }

      const {secureUrl} = await uploadSectionImageBuffer({
        buffer: file.buffer,
        filename: file.originalname
      });

      return res.status(200).json({imageUrl: secureUrl});
    } catch (error) {
      next(error);
    }
  }
};
