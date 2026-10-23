import axios from 'axios';

// Same-origin proxy path (see httpClient.ts / next.config.ts) so upload requests
// stay first-party and carry auth cookies on iOS/Safari.
const API_BASE_URL = '/api';
const resolvedBaseUrl = API_BASE_URL;

const uploadClient = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 60_000,
  withCredentials: true
});

export type UploadProductImageResponse = {
  imageUrl: string;
};

export type UploadPromoImageResponse = {
  imageUrl: string;
};

export type UploadSectionImageResponse = {
  imageUrl: string;
};

export type UploadReviewImageResponse = {
  imageUrl: string;
};

export type UploadCategoryImageResponse = {
  imageUrl: string;
};

export async function uploadProductImage(file: File) {
  const data = new FormData();
  data.append('file', file);

  const res = await uploadClient.post<UploadProductImageResponse>(
    '/upload/product-image',
    data
  );

  return res.data;
}

export async function uploadPromoImage(file: File) {
  const data = new FormData();
  data.append('file', file);

  const res = await uploadClient.post<UploadPromoImageResponse>(
    '/upload/promo-image',
    data
  );

  return res.data;
}

export async function uploadProfileImage(file: File) {
  const data = new FormData();
  data.append('file', file);

  const res = await uploadClient.post<UploadProductImageResponse>(
    '/upload/profile-image',
    data
  );

  return res.data;
}

export async function uploadSectionImage(file: File) {
  const data = new FormData();
  data.append('file', file);

  const res = await uploadClient.post<UploadSectionImageResponse>(
    '/upload/section-image',
    data
  );

  return res.data;
}

export async function uploadReviewImage(file: File) {
  const data = new FormData();
  data.append('file', file);

  const res = await uploadClient.post<UploadReviewImageResponse>(
    '/upload/review-image',
    data
  );

  return res.data;
}

export async function uploadCategoryImage(file: File) {
  const data = new FormData();
  data.append('file', file);

  const res = await uploadClient.post<UploadCategoryImageResponse>(
    '/upload/category-image',
    data
  );

  return res.data;
}

export async function uploadPaymentImage(file: File) {
  const data = new FormData();
  data.append('file', file);

  const res = await uploadClient.post<UploadSectionImageResponse>(
    '/upload/payment-image',
    data
  );

  return res.data;
}
