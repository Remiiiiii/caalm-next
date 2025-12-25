'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { getSplineSceneUrl } from '@/lib/spline-config';

// Dynamically import Spline only on client side
const Spline = dynamic(
  () => import('@splinetool/react-spline').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
        <div className="text-white text-sm">Loading 3D scene...</div>
      </div>
    ),
  }
);

interface SplineExpirySceneProps {
  className?: string;
}

export default function SplineExpiryScene({
  className = '',
}: SplineExpirySceneProps) {
  const [sceneUrl, setSceneUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const url = getSplineSceneUrl();
    if (url) {
      setSceneUrl(url);
    } else {
      console.warn(
        'Spline scene URL not configured. Add NEXT_PUBLIC_SPLINE_SCENE_URL to .env.local'
      );
      setHasError(true);
      setIsLoading(false);
    }
  }, []);

  // Disable pointer events on Spline canvas elements
  useEffect(() => {
    const disablePointerEvents = () => {
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach((canvas) => {
        if (canvas.style.pointerEvents !== 'none') {
          canvas.style.pointerEvents = 'none';
        }
      });
    };

    // Run immediately and after a short delay to catch dynamically created canvases
    disablePointerEvents();
    const interval = setInterval(disablePointerEvents, 100);

    return () => clearInterval(interval);
  }, [sceneUrl, isLoading]);

  if (hasError || !sceneUrl) {
    // Fallback: subtle gradient background if Spline scene is not available
    return (
      <div
        className={`absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${className}`}
      />
    );
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Spline scene - in front, no blur */}
      <div className="absolute inset-0 pointer-events-none">
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-transparent">
              <div className="text-slate-700 text-sm">Loading 3D scene...</div>
            </div>
          }
        >
          <Spline
            scene={sceneUrl}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            className="w-full h-full"
          />
        </Suspense>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent z-30">
          <div className="text-slate-700 text-sm">Loading 3D scene...</div>
        </div>
      )}
    </div>
  );
}
