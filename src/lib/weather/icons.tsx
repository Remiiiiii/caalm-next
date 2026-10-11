import {
	Cloud,
	CloudLightning,
	CloudMoon,
	CloudRain,
	CloudSnow,
	CloudSun,
	Moon,
	Sparkles,
	Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function formatTemperature(temp: number): string {
	return `${Math.round(temp)}°F`;
}

/** OpenWeather `units=imperial` → wind.speed is mph */
export function formatWindSpeed(speedMph: number): string {
	return `${Math.round(speedMph * 1.60934)} km/h`;
}

type IconSize = "sm" | "md" | "lg" | "xl";
type IconTone = "default" | "onDark";

const SIZE: Record<IconSize, string> = {
	sm: "h-8 w-8",
	md: "h-10 w-10",
	lg: "h-14 w-14",
	xl: "h-16 w-16",
};

export function getWeatherIcon(
	weatherMain: string,
	iconCode: string,
	size: IconSize = "md",
	tone: IconTone = "default",
) {
	const iconClass = SIZE[size];
	const isNight = iconCode?.endsWith("n") ?? false;
	const onDark = tone === "onDark";
	const white = onDark ? "text-white drop-shadow-md" : "text-slate-500 drop-shadow-sm";
	const amber = onDark
		? "text-amber-300 drop-shadow-md"
		: "text-amber-400 drop-shadow-sm";
	const soft = onDark ? "text-white/90 drop-shadow-md" : "text-slate-400 drop-shadow-sm";

	switch (weatherMain.toLowerCase()) {
		case "clear":
			return (
				<div className="relative">
					{isNight ? (
						<>
							<Moon className={cn(iconClass, soft)} />
							{onDark ? (
								<Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-amber-300" />
							) : null}
						</>
					) : (
						<Sun className={cn(iconClass, amber)} />
					)}
				</div>
			);
		case "clouds":
			return (
				<div className="relative">
					{isNight ? (
						<CloudMoon className={cn(iconClass, white)} />
					) : iconCode?.startsWith("02") ? (
						<CloudSun className={cn(iconClass, white)} />
					) : (
						<Cloud className={cn(iconClass, white)} />
					)}
					{onDark && isNight ? (
						<>
							<span className="absolute -top-0.5 right-1 h-1 w-1 rounded-full bg-amber-300" />
							<span className="absolute top-1 -right-0.5 h-1 w-1 rounded-full bg-amber-200" />
						</>
					) : null}
				</div>
			);
		case "rain":
		case "drizzle":
			return (
				<div className="relative">
					<CloudRain
						className={cn(
							iconClass,
							onDark ? "text-white drop-shadow-md" : "text-blue-500 drop-shadow-sm",
						)}
					/>
				</div>
			);
		case "thunderstorm":
			return (
				<div className="relative">
					<CloudLightning
						className={cn(
							iconClass,
							onDark
								? "text-amber-200 drop-shadow-md"
								: "text-purple-600 drop-shadow-sm",
						)}
					/>
				</div>
			);
		case "snow":
			return (
				<div className="relative">
					<CloudSnow
						className={cn(
							iconClass,
							onDark ? "text-white drop-shadow-md" : "text-blue-200 drop-shadow-sm",
						)}
					/>
				</div>
			);
		case "mist":
		case "fog":
		case "haze":
			return (
				<div className="relative">
					<Cloud className={cn(iconClass, soft)} />
				</div>
			);
		default:
			return (
				<div className="relative">
					<Cloud className={cn(iconClass, white)} />
				</div>
			);
	}
}
