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

  return (
    <div
      className={`${className} ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={wrapperStyle}
    >
      <Spline scene={scene} className="w-full h-full" />
    </div>
  );
}
