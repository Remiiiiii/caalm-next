'use client';
import { useEffect, useState } from 'react';

export default function ClientDate({ dateString }: { dateString: string }) {
  const [formatted, setFormatted] = useState<string>('');

  useEffect(() => {
    setFormatted(new Date(dateString).toLocaleDateString());
  }, [dateString]);

  // Optionally, show a placeholder while loading
  return <span>{formatted || '...'}</span>;
}
