'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { getSplineSceneUrl } from '@/lib/spline-config';
import { Sparkles } from 'lucide-react';
import { useSplineWatermarkRemoval } from '@/hooks/useSplineWatermarkRemoval';

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

  // Remove Spline watermark badges
  useSplineWatermarkRemoval();

  useEffect(() => {
    const url = getSplineSceneUrl();
    console.log('Spline scene URL:', url); // Debug: verify which URL is being used
    if (url) {
      setSceneUrl(url);
    } else {
      // Fallback to local file
      setSceneUrl('/scene.splinecode');
    }
  }, []);

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

      {/* Using same backdrop as modal to blend seamlessly */}
      {/* <div
        className="rounded-md border glass-card absolute top-[50%] left-[19%] w-[138px] h-[39px] z-[10001] pointer-events-none flex items-center gap-2 px-3"
        style={{
          background: 'white',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
        }}
      >
        <Image
          src="/assets/icons/sparkles.svg"
          alt="Caalm AI"
          width={24}
          height={24}
        />
        <span className="text-slate-800 text-md sidebar-gradient-text">
          Caalm AI
        </span>
      </div>  */}
    </div>
  );
}
