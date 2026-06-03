// Storage Service - Firebase Storage integration for vendor PDF quotes

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';

// Initialize Firebase Admin (only once)
function getFirebaseApp() {
  if (getApps().length === 0) {
    // Check if we have Firebase credentials
    if (!env.FIREBASE_PROJECT_ID) {
      console.warn('Firebase not configured - PDF uploads will be disabled');
      return null;
    }

    try {
      initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
      });
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      return null;
    }
  }
  return getApps()[0];
}

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types for quotes
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

// Validate file before upload
export function validateFile(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: PDF, JPEG, PNG, WebP`,
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: 10MB`,
    };
  }

  return { valid: true };
}

// Upload file to Firebase Storage
export async function uploadVendorQuote(
  vendorId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  const app = getFirebaseApp();
  
  if (!app) {
    return {
      success: false,
      error: 'Storage not configured',
    };
  }

  // Validate file
  const validation = validateFile(mimeType, fileBuffer.length);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    const bucket = getStorage().bucket();
    
    // Generate unique file path
    const fileExtension = getFileExtension(mimeType);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = `vendor-quotes/${vendorId}/${uniqueFileName}`;

    const file = bucket.file(filePath);

    // Upload file
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          originalName: fileName,
          vendorId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Make file publicly accessible (or use signed URLs)
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return {
      success: true,
      fileUrl: publicUrl,
      fileName,
      fileSize: fileBuffer.length,
    };
  } catch (error: any) {
    console.error('Failed to upload file:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

// Generate a signed URL for private file access
export async function getSignedUrl(
  filePath: string,
  expirationMinutes: number = 60
): Promise<string | null> {
  const app = getFirebaseApp();
  
  if (!app) {
    return null;
  }

  try {
    const bucket = getStorage().bucket();
    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expirationMinutes * 60 * 1000,
    });

    return url;
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    return null;
  }
}

// Delete file from storage
export async function deleteVendorQuoteFile(fileUrl: string): Promise<boolean> {
  const app = getFirebaseApp();
  
  if (!app) {
    return false;
  }

  try {
    // Extract file path from URL
    const bucket = getStorage().bucket();
    const bucketName = bucket.name;
    
    // URL format: https://storage.googleapis.com/BUCKET/PATH
    const urlPrefix = `https://storage.googleapis.com/${bucketName}/`;
    if (!fileUrl.startsWith(urlPrefix)) {
      return false;
    }

    const filePath = fileUrl.substring(urlPrefix.length);
    const file = bucket.file(filePath);

    await file.delete();
    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
}

// Helper to get file extension from MIME type
function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return '.pdf';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
}

// ── Inquiry mood-board images (planner-style uploads, public form) ──
const INQUIRY_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_INQUIRY_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateInquiryImageFile(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!INQUIRY_IMAGE_MIMES.includes(mimeType as (typeof INQUIRY_IMAGE_MIMES)[number])) {
    return { valid: false, error: 'Invalid image type. Allowed: JPEG, PNG, WebP' };
  }
  if (fileSize > MAX_INQUIRY_IMAGE_BYTES) {
    return { valid: false, error: 'Image too large. Maximum size: 5MB per file' };
  }
  return { valid: true };
}

export async function uploadInquiryImage(
  shareToken: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  const app = getFirebaseApp();

  if (!app) {
    return {
      success: false,
      error: 'Storage not configured',
    };
  }

  const validation = validateInquiryImageFile(mimeType, fileBuffer.length);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    const bucket = getStorage().bucket();
    const fileExtension = getFileExtension(mimeType);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const safeToken = shareToken.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = `inquiry-images/${safeToken || 'token'}/${uniqueFileName}`;

    const file = bucket.file(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          originalName: fileName,
          shareToken,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return {
      success: true,
      fileUrl: publicUrl,
      fileName,
      fileSize: fileBuffer.length,
    };
  } catch (error: any) {
    console.error('Failed to upload inquiry image:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}
