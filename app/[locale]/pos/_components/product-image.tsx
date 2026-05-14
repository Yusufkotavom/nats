'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const LOCAL_FALLBACK_IMAGES = [
  "/uploads/seed/seafood-pixabay/seafood-001.jpg",
  "/uploads/seed/seafood-pixabay/seafood-002.png",
  "/uploads/seed/seafood-pixabay/seafood-003.png",
  "/uploads/seed/seafood-pixabay/seafood-004.jpg",
  "/uploads/seed/seafood-pixabay/seafood-005.png",
  "/uploads/seed/seafood-pixabay/seafood-006.jpg",
  "/uploads/seed/seafood-pixabay/seafood-007.png",
  "/uploads/seed/seafood-pixabay/seafood-008.jpg",
  "/uploads/seed/seafood-pixabay/seafood-009.jpg",
  "/uploads/seed/seafood-pixabay/seafood-010.jpg",
  "/uploads/seed/seafood-pixabay/seafood-011.jpg",
  "/uploads/seed/seafood-pixabay/seafood-012.jpg",
  "/uploads/seed/seafood-pixabay/seafood-013.jpg",
  "/uploads/seed/seafood-pixabay/seafood-014.jpg",
  "/uploads/seed/seafood-pixabay/seafood-015.jpg",
  "/uploads/seed/seafood-pixabay/seafood-016.jpg",
  "/uploads/seed/seafood-pixabay/seafood-017.jpg",
  "/uploads/seed/seafood-pixabay/seafood-018.jpg",
  "/uploads/seed/seafood-pixabay/seafood-019.jpg",
  "/uploads/seed/seafood-pixabay/seafood-020.jpg",
  "/uploads/seed/seafood-pixabay/seafood-021.jpg",
  "/uploads/seed/seafood-pixabay/seafood-022.jpg",
  "/uploads/seed/seafood-pixabay/seafood-023.jpg",
  "/uploads/seed/seafood-pixabay/seafood-024.jpg",
  "/uploads/seed/seafood-pixabay/seafood-025.jpg",
  "/uploads/seed/seafood-pixabay/seafood-026.jpg",
  "/uploads/seed/seafood-pixabay/seafood-027.jpg",
  "/uploads/seed/seafood-pixabay/seafood-028.jpg",
  "/uploads/seed/seafood-pixabay/seafood-029.jpg",
  "/uploads/seed/seafood-pixabay/seafood-030.jpg",
  "/uploads/seed/seafood-pixabay/seafood-031.jpg",
  "/uploads/seed/seafood-pixabay/seafood-032.jpg",
  "/uploads/seed/seafood-pixabay/seafood-033.jpg",
  "/uploads/seed/seafood-pixabay/seafood-034.jpg",
  "/uploads/seed/seafood-pixabay/seafood-035.png",
  "/uploads/seed/seafood-pixabay/seafood-036.jpg",
  "/uploads/seed/seafood-pixabay/seafood-037.jpg",
  "/uploads/seed/seafood-pixabay/seafood-038.jpg",
  "/uploads/seed/seafood-pixabay/seafood-039.jpg",
  "/uploads/seed/seafood-pixabay/seafood-040.jpg",
] as const;

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
  category?: string | null;
  productId: string;
}

export function ProductImage({
  src,
  alt,
  className,
}: ProductImageProps) {
  const [error, setError] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [fallbackSrc] = useState(
    () =>
      LOCAL_FALLBACK_IMAGES[
        Math.floor(Math.random() * LOCAL_FALLBACK_IMAGES.length)
      ],
  );

  // If we have a valid source and no error, use it
  if (src && !error) {
    return (
      <div className={cn("relative h-full w-full overflow-hidden bg-muted", className)}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-muted", className)}>
      <Image
        src={fallbackSrc}
        alt={alt}
        fill
        className="object-cover opacity-90 hover:opacity-100 transition-opacity"
        // If the fallback also fails (e.g. offline), show the icon placeholder
        onError={() => setFallbackFailed(true)}
      />
      {/* Fallback for when the image fails to load or is loading */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground/20",
          fallbackFailed ? "z-10" : "-z-10",
        )}
      >
         <span className="text-4xl font-bold">{alt.charAt(0)}</span>
      </div>
    </div>
  );
}
