"use client";

import { useWeatherData } from "@/hooks/useWeatherData";
import { cn } from "@/lib/utils";
import { formatTemperature, getWeatherIcon } from "@/lib/weather/icons";

type WeatherBriefingButtonProps = {
	location?: string;
	latitude?: number;
	longitude?: number;
	onClick: () => void;
};

export function WeatherBriefingButton({
	location,
	latitude,
	longitude,
	onClick,
}: WeatherBriefingButtonProps) {
	const { weatherData, loading } = useWeatherData({
		location,
		latitude,
		longitude,
	});

	const condition = weatherData?.weather[0]?.description ?? "";
	const tempLabel = weatherData
		? formatTemperature(weatherData.main.temp)
		: "";
	const ariaLabel = weatherData
		? `Weather, ${Math.round(weatherData.main.temp)} degrees, ${condition}. Open briefing.`
		: "Open weather briefing";

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={ariaLabel}
			className={cn(
				"flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-left",
				"transition-all duration-200 hover:bg-white/50",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
			)}
		>
			{loading || !weatherData ? (
				<>
					<div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200" />
					<div className="space-y-1.5">
						<div className="h-5 w-14 animate-pulse rounded bg-slate-200" />
						<div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
					</div>
				</>
			) : (
				<>
					{getWeatherIcon(
						weatherData.weather[0].main,
						weatherData.weather[0].icon,
						"sm",
					)}
					<div className="leading-tight">
						<div className="text-xl font-bold tracking-tight sidebar-gradient-text">
							{tempLabel}
						</div>
						<div className="text-xs font-medium capitalize text-slate-600">
							{condition}
						</div>
					</div>
				</>
			)}
		</button>
	);
}
