'use client';

import { useState, useEffect } from 'react';

const ClientTimestamp = () => {
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    const updateTimestamp = () => {
      setTimestamp(new Date().toLocaleTimeString());
    };

    // Set initial timestamp
    updateTimestamp();

    // Update every second
    const interval = setInterval(updateTimestamp, 1000);

    return () => clearInterval(interval);
  }, []);

  return <span>{timestamp}</span>;
};

export default ClientTimestamp;
