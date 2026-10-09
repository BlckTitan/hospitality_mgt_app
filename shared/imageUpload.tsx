'use client';

import React, { useId, useRef, useState } from 'react';
import Image from 'next/image';
import { FieldError } from 'react-hook-form';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Field, fieldWidthClass } from './field';
import Spinner from './spinner';
import {
  CLOUDINARY_ALLOWED_MIME_TYPES,
  CLOUDINARY_HELPER_TEXT,
  CLOUDINARY_MAX_DIMENSION_PX,
  CLOUDINARY_MAX_FILE_BYTES,
  formatCloudinaryBytes,
  type CloudinaryUploadResult,
} from '../lib/cloudinary-shared';
import { cloudinaryDeliveryUrl } from '../lib/cloudinary-url';

type ImageUploadProps = {
  id?: string;
  label?: string;
  /** Current image URL (Cloudinary secure_url or any https URL). */
  value?: string | null;
  /** Called with the new URL, or null when cleared. */
  onChange: (url: string | null) => void;
  /** Optional callback with full Cloudinary metadata after a successful upload. */
  onUploadComplete?: (result: CloudinaryUploadResult) => void;
  /**
   * Subfolder under CLOUDINARY_UPLOAD_FOLDER (e.g. "beverages", "staff").
   * Helps organize assets in the Cloudinary media library.
   */
  folder?: string;
  inputWidth?: string;
  error?: FieldError | { message?: string };
  disabled?: boolean;
  /** When true, Remove is hidden and the label shows *. */
  required?: boolean;
  /** Accept attribute override. Defaults to JPEG/PNG/WebP. */
  accept?: string;
  helperText?: string;
};

type SignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  allowedFormats: string;
  overwrite: number;
  error?: string;
};

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const size = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(size);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image dimensions.'));
    };
    img.src = objectUrl;
  });
}

async function validateImageFile(file: File): Promise<string | null> {
  if (!CLOUDINARY_ALLOWED_MIME_TYPES.includes(file.type as (typeof CLOUDINARY_ALLOWED_MIME_TYPES)[number])) {
    return 'Only JPEG, PNG, and WebP images are allowed.';
  }
  if (file.size > CLOUDINARY_MAX_FILE_BYTES) {
    return `Image must be ${formatCloudinaryBytes(CLOUDINARY_MAX_FILE_BYTES)} or smaller.`;
  }
  try {
    const { width, height } = await readImageDimensions(file);
    if (Math.max(width, height) > CLOUDINARY_MAX_DIMENSION_PX) {
      return `Image must be ${CLOUDINARY_MAX_DIMENSION_PX}px or smaller on its longest side.`;
    }
  } catch {
    return 'Could not read image. Please try another file.';
  }
  return null;
}

export default function ImageUpload({
  id,
  label = 'Image',
  value,
  onChange,
  onUploadComplete,
  folder,
  inputWidth = 'w-full',
  error,
  disabled = false,
  required = false,
  accept = CLOUDINARY_ALLOWED_MIME_TYPES.join(','),
  helperText = CLOUDINARY_HELPER_TEXT,
}: ImageUploadProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const displayLabel = required ? `${label} *` : label;

  const uploadFile = async (file: File) => {
    const validationError = await validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    try {
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });

      const signed = (await signRes.json()) as SignResponse;
      if (!signRes.ok) {
        throw new Error(signed.error || 'Could not authorize upload.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signed.apiKey);
      formData.append('timestamp', String(signed.timestamp));
      formData.append('signature', signed.signature);
      formData.append('folder', signed.folder);
      formData.append('allowed_formats', signed.allowedFormats);
      formData.append('overwrite', String(signed.overwrite));

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
        { method: 'POST', body: formData },
      );

      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploaded?.error?.message || 'Cloudinary upload failed.');
      }

      const result: CloudinaryUploadResult = {
        url: uploaded.secure_url as string,
        publicId: uploaded.public_id as string,
        width: uploaded.width,
        height: uploaded.height,
        format: uploaded.format,
        bytes: uploaded.bytes,
      };

      onChange(result.url);
      onUploadComplete?.(result);
      toast.success('Image uploaded.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      console.error('[ImageUpload]', err);
      toast.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (disabled || uploading || !files?.length) return;
    void uploadFile(files[0]);
  };

  const clearImage = () => {
    if (disabled || uploading || required) return;
    onChange(null);
  };

  return (
    <Field id={inputId} label={displayLabel} widthClass={fieldWidthClass(inputWidth)}>
      <div className="w-full max-w-full min-w-0">
        {value ? (
          <div className="relative w-full max-w-sm overflow-hidden rounded-md border border-gray-300 bg-gray-50">
            <div className="relative h-40 w-full">
              <Image
                src={cloudinaryDeliveryUrl(value, { width: 384, height: 160, crop: 'fill' }) || value}
                alt="Uploaded preview"
                fill
                unoptimized={!value.includes('res.cloudinary.com')}
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 24rem"
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-2 py-2">
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Replace
              </button>
              {!required && (
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={clearImage}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <Spinner />
              </div>
            )}
          </div>
        ) : (
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled && !uploading) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={[
              'flex w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors',
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400',
              (disabled || uploading) && 'cursor-not-allowed opacity-60',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {uploading ? (
              <>
                <Spinner />
                <span className="text-sm text-gray-600">Uploading…</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Drop an image here, or click to browse
                </span>
                <span className="text-xs text-gray-500">{helperText}</span>
              </>
            )}
          </label>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {error?.message && (
          <span className="mt-1 block text-sm text-red-500">{error.message}</span>
        )}
      </div>
    </Field>
  );
}
