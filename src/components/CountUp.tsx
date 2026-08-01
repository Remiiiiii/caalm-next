"use client";

import { useEffect, useId, useState } from "react";
import { useCountUp } from "react-countup";

type CountUpProps = {
	end?: number;
	delay?: number;
	duration?: number;
	/** Unique DOM id when multiple counters are on the page */
	id?: string;
};

function CountUpActive({
	end,
	delay,
	duration,
	id,
}: Required<CountUpProps>) {
	useCountUp({ ref: id, end, delay, duration });
	return <span id={id} className="tabular-nums" />;
}

const CountUp = ({
	end = 5000,
	delay = 3,
	duration = 3,
	id,
}: CountUpProps) => {
	const reactId = useId().replace(/:/g, "");
	const counterId = id ?? `counter-${reactId}`;
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <span className="tabular-nums">0</span>;
	}

	return (
		<CountUpActive
			id={counterId}
			end={end}
			delay={delay}
			duration={duration}
		/>
	);
};

export default CountUp;
