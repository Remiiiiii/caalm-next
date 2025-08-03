'use client';

import React from 'react';
import { useCountUp } from 'react-countup';

const CountUp = () => {
  const SimpleHook = () => {
    useCountUp({ ref: 'counter', end: 5000, delay: 3, duration: 3 });
    return <span id="counter" />;
  };
  return <SimpleHook />;
};

export default CountUp;
