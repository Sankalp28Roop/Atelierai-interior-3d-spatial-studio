import React, { useState } from 'react';
import { ImageOff, Sparkles } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
  className?: string;
  containerClassName?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = 'Interior visual',
  fallbackTitle,
  className = '',
  containerClassName = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // If the source URL points to pollinations (which can return the yellow rate-limit card), sanitize it to safe local render
  const safeSrc = (src && src.includes('image.pollinations.ai'))
    ? '/src/assets/images/scene_industrial_loft_kitchen_1794277382447.jpg'
    : src;

  if (hasError || !safeSrc) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-stone-900 border border-stone-800 text-stone-400 p-6 overflow-hidden rounded-xl ${containerClassName}`}
      >
        <div className="w-12 h-12 rounded-full bg-stone-800/80 flex items-center justify-center mb-2 text-stone-500">
          <ImageOff className="w-6 h-6" />
        </div>
        <p className="text-xs font-medium text-stone-300 text-center line-clamp-2">
          {fallbackTitle || alt || 'Visual preview unavailable'}
        </p>
        <span className="text-[10px] text-stone-500 mt-1">Curated architectural asset</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-stone-900 animate-pulse flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-stone-600 animate-spin" />
        </div>
      )}
      <img
        src={safeSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`}
        {...props}
      />
    </div>
  );
};
