'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Bell,
  GitBranch,
  BarChart3,
  Lock,
  Calendar,
  FileCheck,
  Users2,
} from 'lucide-react';

const features = [
  { icon: Database, color: '#00c1cb' },
  { icon: Bell, color: '#078fab' },
  { icon: GitBranch, color: '#0e638f' },
  { icon: BarChart3, color: '#11487d' },
  { icon: Lock, color: '#162768' },
  { icon: Calendar, color: '#00c1cb' },
  { icon: FileCheck, color: '#078fab' },
  { icon: Users2, color: '#0e638f' },
];

const OrbitingBlocks = () => {
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Constant animation speed (degrees per millisecond)
  const ROTATION_SPEED = 0.02; // degrees per frame at 60fps

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      const deltaRotation = ROTATION_SPEED * deltaTime;

      setRotation((prev) => (prev + deltaRotation) % 360);
      lastTimeRef.current = currentTime;

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {features.map((feature, i) => {
        const Icon = feature.icon;
        const baseAngle = (360 / features.length) * i;
        const angle = ((baseAngle - rotation) * Math.PI) / 180;

        // Orbit around the Spline component
        const radiusX = 200; // Horizontal radius
        const radiusY = 80; // Vertical radius for elliptical orbit

        // Position calculation - center around Spline
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY;

        // Z-index and depth calculation
        // Spline is at z-index 10, so we'll use 5-15 range
        const baseZIndex = 10;
        const zOffset = Math.sin(angle) * 5; // -5 to +5 range
        const zIndex = Math.round(baseZIndex + zOffset);

        // Scale based on depth (behind vs in front of Spline)
        const isBehind = zIndex < 10;
        const baseScale = isBehind ? 0.6 : 1.0; // Smaller when behind
        const scaleVariation = 0.1; // Additional scale variation
        const finalScale = baseScale + scaleVariation * Math.sin(angle * 2);

        // Opacity based on depth
        const baseOpacity = isBehind ? 0.9 : 0.8;
        const opacityVariation = 0.2;
        const finalOpacity =
          baseOpacity + opacityVariation * Math.sin(angle * 3);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: `translate(-50%, -50%) scale(${finalScale})`,
              opacity: finalOpacity,
              zIndex,
            }}
            className="transition-transform duration-500 ease-in-out"
          >
            <div className="w-14 h-14 rounded-xl bg-white/90 backdrop-blur-sm border border-white/20 shadow-lg flex items-center justify-center">
              <Icon className="w-10 h-10" style={{ color: feature.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrbitingBlocks;
