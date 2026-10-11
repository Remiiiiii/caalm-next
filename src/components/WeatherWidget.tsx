"use client";

import {
	Cloud,
	CloudRain,
	Clock,
	MapPin,
	Sunrise,
	Sunset,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { cn } from "@/lib/utils";
import {
	formatTemperature,
	formatWindSpeed,
	getWeatherIcon,
} from "@/lib/weather/icons";
import { getWeatherScene } from "@/lib/weather/theme";

interface WeatherWidgetProps {
	location?: string;
	latitude?: number;
	longitude?: number;
	/** Auto-height for the briefing sheet; fixed height was for the carousel. */
	embedded?: boolean;
}

function formatClockLabel(date: Date) {
	const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
	const time = date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	return `${weekday}, ${time.toLowerCase()}`;
}

function formatSunTime(unixSec: number, timezoneSec: number) {
	if (!unixSec) return "—";
	const localMs = (unixSec + timezoneSec) * 1000;
	return new Date(localMs).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
		timeZone: "UTC",
	}).toLowerCase();
}

function daylightDuration(sunrise: number, sunset: number) {
	if (!sunrise || !sunset || sunset <= sunrise) return "—";
	const mins = Math.round((sunset - sunrise) / 60);
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return `${h} h ${m} m`;
}

function regionLabel(countryCode: string | null): string | null {
	if (!countryCode) return null;
	try {
		return (
			new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ||
			countryCode
		);
	} catch {
		return countryCode;
	}
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({
	location,
	latitude,
	longitude,
	embedded = false,
}) => {
	const { weatherData, loading, error, userLocation } = useWeatherData({
		location,
		latitude,
		longitude,
	});
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 60_000);
		return () => window.clearInterval(id);
	}, []);

	const scene = useMemo(() => {
		if (!weatherData?.weather[0]) return null;
		const nowSec = Math.floor(now.getTime() / 1000);
		return getWeatherScene(
			weatherData.weather[0].main,
			weatherData.weather[0].icon,
			nowSec,
			weatherData.sunrise,
			weatherData.sunset,
		);
	}, [weatherData, now]);

	const shellClass = cn(
		"relative w-full overflow-hidden rounded-3xl text-white shadow-xl",
		embedded ? "h-auto" : "min-h-[280px]",
	);

	if (loading) {
		return (
			<div
				className={cn(shellClass, "bg-[#0a1f3d]")}
				aria-busy="true"
				aria-label="Loading weather"
			>
				<div className="flex h-48 items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
				</div>
			</div>
		);
	}

	if (error || !weatherData || !scene) {
		return (
			<div className={cn(shellClass, "bg-[#0a1f3d]")}>
				<div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
					<Cloud className="h-8 w-8 text-white/50" />
					<p className="text-sm font-medium text-white/90">
						Weather unavailable
					</p>
					<p className="text-xs text-white/50">
						{error || "Check your connection"}
					</p>
				</div>
			</div>
		);
	}

	const w = weatherData.weather[0];
	const country = regionLabel(weatherData.country);
	const place =
		country && weatherData.name
			? `${country}, ${weatherData.name}`
			: weatherData.name || userLocation;
	const tomorrowPop = weatherData.tomorrowPrecipChance;

	return (
		<div
			className={shellClass}
			style={{ background: scene.background }}
		>
			<div
				className="pointer-events-none absolute inset-0"
				style={{ background: scene.glow }}
				aria-hidden
			/>

			<div className="relative z-10 space-y-5 px-5 py-5 sm:px-6 sm:py-6">
				{/* Header */}
				<div className="flex items-start justify-between gap-3 text-sm text-white/95">
					<div className="flex min-w-0 items-center gap-1.5">
						<MapPin className="h-3.5 w-3.5 shrink-0 opacity-90" />
						<span className="truncate font-medium">{place}</span>
					</div>
					<div className="flex shrink-0 items-center gap-1.5 text-white/90">
						<Clock className="h-3.5 w-3.5 opacity-90" />
						<span className="whitespace-nowrap">{formatClockLabel(now)}</span>
					</div>
				</div>

				{/* Current */}
				<div className="flex items-center justify-between gap-3">
					<div className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
						{formatTemperature(weatherData.main.temp).replace("F", "")}
					</div>
					<div className="flex shrink-0 justify-center">
						{getWeatherIcon(w.main, w.icon, "xl", "onDark")}
					</div>
					<div className="min-w-[7.5rem] space-y-1 text-right text-xs sm:text-sm">
						<p className="text-white/65">
							Precipitation:{" "}
							<span className="font-medium text-white">
								{weatherData.precipChance != null
									? `${weatherData.precipChance}%`
									: "—"}
							</span>
						</p>
						<p className="text-white/65">
							Humidity:{" "}
							<span className="font-medium text-white">
								{weatherData.main.humidity}%
							</span>
						</p>
						<p className="text-white/65">
							Wind:{" "}
							<span className="font-medium text-white">
								{formatWindSpeed(weatherData.wind.speed)}
							</span>
						</p>
					</div>
				</div>

				{/* Daylight */}
				<div className="flex items-center gap-2 text-xs text-white/90 sm:text-sm">
					<div className="flex items-center gap-1.5">
						<Sunrise className="h-4 w-4 text-amber-200" />
						<span>
							{formatSunTime(weatherData.sunrise, weatherData.timezone)}
						</span>
					</div>
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<div className="h-px flex-1 border-t border-dotted border-white/40" />
						<span className="shrink-0 tabular-nums text-white/80">
							{daylightDuration(weatherData.sunrise, weatherData.sunset)}
						</span>
						<div className="h-px flex-1 border-t border-dotted border-white/40" />
					</div>
					<div className="flex items-center gap-1.5">
						<span>
							{formatSunTime(weatherData.sunset, weatherData.timezone)}
						</span>
						<Sunset className="h-4 w-4 text-amber-200" />
					</div>
				</div>

				{/* Tomorrow precip highlight */}
				{tomorrowPop != null && tomorrowPop >= 40 ? (
					<div className="flex items-center justify-center gap-2 rounded-full bg-black/25 px-4 py-2 text-sm text-white backdrop-blur-sm">
						<CloudRain className="h-4 w-4 shrink-0" />
						<span>{tomorrowPop}% chance of rain tomorrow</span>
					</div>
				) : null}

				{/* Daily forecast */}
				{weatherData.daily.length > 0 ? (
					<div className="flex justify-between gap-1 pt-1">
						{weatherData.daily.map((day) => (
							<div
								key={day.date}
								className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
							>
								<span className="text-[11px] font-medium text-white/90 sm:text-xs">
									{day.label}
								</span>
								{getWeatherIcon(day.main, day.icon, "sm", "onDark")}
								<span className="text-sm font-semibold tabular-nums text-white">
									{day.high}°
								</span>
								<span className="text-xs tabular-nums text-white/55">
									{day.low}°
								</span>
							</div>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
};

export default WeatherWidget;
