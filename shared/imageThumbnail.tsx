'use client';

import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { cloudinaryDeliveryUrl } from '../lib/cloudinary-url';

type ImageThumbnailProps = {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  rounded?: 'sm' | 'md' | 'full';
};

const ROUND = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  full: 'rounded-full',
} as const;

/** Compact table/list thumbnail with Cloudinary delivery transforms. */
export default function ImageThumbnail({
  src,
  alt,
  size = 40,
  className = '',
  rounded = 'md',
}: ImageThumbnailProps) {
  const optimized = cloudinaryDeliveryUrl(src, {
    width: size,
    height: size,
    crop: 'fill',
    aspectRatio: '1:1',
  });

  if (!optimized) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-gray-100 text-gray-400 ${ROUND[rounded]} ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <ImageIcon style={{ width: size * 0.45, height: size * 0.45 }} />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-block overflow-hidden bg-gray-100 ${ROUND[rounded]} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={optimized}
        alt={alt}
        fill
        unoptimized={!optimized.includes('res.cloudinary.com')}
        className="object-cover"
        sizes={`${size}px`}
      />
    </span>
  );
}
