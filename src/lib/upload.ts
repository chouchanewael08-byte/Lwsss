import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { ENV } from '../config/env.js';

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

// Memory storage - we'll upload manually for better control
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم. استخدم JPG, PNG, WEBP, GIF'));
  }
});

export async function uploadToCloudinary(buffer: Buffer, folder: string = 'marketplace'): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', quality: 'auto', fetch_format: 'auto' },
      (error, result) => {
        if (error || !result) reject(error || new Error('Upload failed'));
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(url: string) {
  try {
    const parts = url.split('/');
    const publicId = parts.slice(-2).join('/').replace(/\.[^/.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
  } catch { /* ignore */ }
}
