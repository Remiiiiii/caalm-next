'use client';
import { useEffect, useState } from 'react';

export default function ClientOnlyComponent() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  if (!isClient) return null; // or a placeholder

  // Safe to use browser APIs here
  return <div>{window.location.href}</div>;
}
