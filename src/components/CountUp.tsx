"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "react-countup";

function CountUpActive() {
	useCountUp({ ref: "counter", end: 5000, delay: 3, duration: 3 });
	return <span id="counter" />;
}

const CountUp = () => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <span className="tabular-nums">0</span>;
	}

	return <CountUpActive />;
};

export default CountUp;
