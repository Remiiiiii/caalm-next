'use client';

import Spline from '@splinetool/react-spline';
import { useEffect, useState } from 'react';

type SplineCanvasProps = {
  scene: string;
  className?: string;
  delayMs?: number; // time before fade starts
  durationMs?: number; // fade duration
};

export default function SplineCanvas({
  scene,
  className = '',
  delayMs = 3000,
  durationMs = 700,
}: SplineCanvasProps) {
  const [visible, setVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    // Check screen size
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640); // sm breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  const wrapperStyle: React.CSSProperties = {
    transition: `opacity ${durationMs}ms ease-in-out`,
  };

  // Fallback for small screens, when Spline fails to load, or when container has no size
  if (hasError || isSmallScreen) {
    return (
      <div
        className={`${className} ${
          visible ? 'opacity-100' : 'opacity-0'
        } flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg min-h-[200px]`}
        style={wrapperStyle}
      >
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Welcome to Caalm
          </h3>
          <p className="text-sm text-gray-600">
            Streamline your contract management
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setContainerRef}
      className={`${className} ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={wrapperStyle}
    >
      <Spline
        scene={scene}
        className="w-full h-full"
        onLoad={() => setHasError(false)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
