/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Client-side image compression using the Canvas API.
 * Resizes large images and compresses quality — zero external dependencies.
 */

const MAX_DIMENSION = 1920; // Max width or height in pixels
const JPEG_QUALITY = 0.80; // 80% quality — good balance of size vs visual fidelity
const WEBP_QUALITY = 0.80;

/** MIME types that should be compressed. */
const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

/**
 * Load a File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions that fit within MAX_DIMENSION while keeping aspect ratio.
 */
function fitDimensions(width: number, height: number): { w: number; h: number } {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { w: width, h: height };
  }

  const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  return {
    w: Math.round(width * ratio),
    h: Math.round(height * ratio),
  };
}

/**
 * Determine the output MIME type.
 * PNG → WebP (much smaller; transparency preserved in WebP).
 * JPEG/WebP stay as-is.
 */
function outputMimeType(inputType: string): string {
  if (inputType === 'image/png') return 'image/webp';
  return inputType;
}

/**
 * Map MIME type to a file extension.
 */
function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/webp':
      return '.webp';
    case 'image/png':
      return '.png';
    case 'image/jpeg':
    default:
      return '.jpg';
  }
}

/**
 * Compress a single image file.
 * Returns the original file unchanged if it's not an image or compression produces a larger result.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  if (!COMPRESSIBLE_TYPES.has(file.type)) {
    return { file, originalSize: file.size, compressedSize: file.size, wasCompressed: false };
  }

  const img = await loadImage(file);
  const { w, h } = fitDimensions(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { file, originalSize: file.size, compressedSize: file.size, wasCompressed: false };
  }

  ctx.drawImage(img, 0, 0, w, h);

  const outMime = outputMimeType(file.type);
  const quality = outMime === 'image/webp' ? WEBP_QUALITY : JPEG_QUALITY;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outMime, quality));

  if (!blob || blob.size >= file.size) {
    // Compression didn't help — keep original
    return { file, originalSize: file.size, compressedSize: file.size, wasCompressed: false };
  }

  // Build new filename with correct extension
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const newName = baseName + extensionForMime(outMime);

  const compressedFile = new File([blob], newName, {
    type: outMime,
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    wasCompressed: true,
  };
}

/**
 * Compress an array of files. Non-image files pass through unchanged.
 */
export async function compressFiles(files: File[]): Promise<CompressionResult[]> {
  return Promise.all(files.map(compressImage));
}
