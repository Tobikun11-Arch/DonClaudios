import {v2 as cloudinary} from 'cloudinary';

let configured = false;

export function ensureCloudinaryConfigured() {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  configured = true;
}

export async function uploadProductImageBuffer(params: {
  buffer: Buffer;
  filename?: string;
}) {
  ensureCloudinaryConfigured();

  return new Promise<{secureUrl: string}>(function executor(resolve, reject) {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'products',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) {
          return reject(new Error('Cloudinary upload returned no secure_url'));
        }
        resolve({secureUrl: result.secure_url});
      }
    );

    stream.end(params.buffer);
  });
}
