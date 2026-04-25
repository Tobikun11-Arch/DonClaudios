import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const resolvedBaseUrl = API_BASE_URL.length > 0 ? API_BASE_URL : undefined;

const uploadClient = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 60_000,
  withCredentials: true
});

export type UploadProductImageResponse = {
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
