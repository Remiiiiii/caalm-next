"use client";

import { cn } from "@/lib/utils";

type LiveWeatherStatusDotProps = {
	isRefreshing?: boolean;
	className?: string;
};

/** Green live indicator with a subtle sonar ripple (used in weather briefing). */
export function LiveWeatherStatusDot({
	isRefreshing = false,
	className,
}: LiveWeatherStatusDotProps) {
	return (
		<span
			className={cn("relative inline-flex h-2 w-2 shrink-0", className)}
			aria-hidden
		>
			{!isRefreshing ? (
				<>
					<span className="live-weather-sonar absolute inline-flex h-full w-full rounded-full bg-green/60" />
					<span className="live-weather-sonar live-weather-sonar-delay absolute inline-flex h-full w-full rounded-full bg-green/40" />
				</>
			) : null}
			<span
				className={cn(
					"relative inline-flex h-2 w-2 rounded-full",
					isRefreshing ? "bg-blue-400 animate-pulse" : "bg-green",
				)}
			/>
		</span>
	);
}
