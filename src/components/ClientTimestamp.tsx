"use client";

import { useEffect, useRef, useState } from "react";

const SEC_MS = 1000;
const MIN_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function formatRelativeAgo(fromMs: number, nowMs: number): string {
	const elapsed = Math.max(0, nowMs - fromMs);

	if (elapsed >= DAY_MS) {
		const days = Math.floor(elapsed / DAY_MS);
		return `${days} ${days === 1 ? "day" : "days"} ago`;
	}
	if (elapsed >= HOUR_MS) {
		const hours = Math.floor(elapsed / HOUR_MS);
		return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
	}
	if (elapsed >= MIN_MS) {
		const mins = Math.floor(elapsed / MIN_MS);
		return `${mins} min ago`;
	}
	const secs = Math.floor(elapsed / SEC_MS);
	return `${secs} sec ago`;
}

interface ClientTimestampProps {
	/** Absolute time of the last update. Defaults to when this component mounts. */
	updatedAt?: Date | number | string | null;
}

const ClientTimestamp = ({ updatedAt }: ClientTimestampProps) => {
	const mountedAtRef = useRef<number>(Date.now());
	const [label, setLabel] = useState<string>("");

	useEffect(() => {
		const resolveFrom = () => {
			if (updatedAt == null || updatedAt === "") {
				return mountedAtRef.current;
			}
			const parsed =
				typeof updatedAt === "number"
					? updatedAt
					: new Date(updatedAt).getTime();
			return Number.isFinite(parsed) ? parsed : mountedAtRef.current;
		};

		const tick = () => {
			setLabel(formatRelativeAgo(resolveFrom(), Date.now()));
		};

		tick();
		const interval = setInterval(tick, 1000);
		return () => clearInterval(interval);
	}, [updatedAt]);

	return <span>{label}</span>;
};

export default ClientTimestamp;
