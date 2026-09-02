import { Cloud, CloudRain, CloudSnow, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatTemperature(temp: number): string {
	return `${Math.round(temp)}°F`;
}

export function formatWindSpeed(speed: number): string {
	return `${Math.round(speed * 3.6)} km/h`;
}

export function getWeatherIcon(
	weatherMain: string,
	iconCode: string,
	size: "sm" | "md" = "md",
) {
	const iconClass = size === "sm" ? "h-8 w-8" : "h-10 w-10";
	const isNight = iconCode?.endsWith("n") ?? false;

	switch (weatherMain.toLowerCase()) {
		case "clear":
			return (
				<div className="relative">
					{isNight ? (
						<Moon className={cn(iconClass, "text-slate-400 drop-shadow-sm")} />
					) : (
						<Sun className={cn(iconClass, "text-amber-400 drop-shadow-sm")} />
					)}
				</div>
			);
		case "clouds":
			return (
				<div className="relative">
					<Cloud className={cn(iconClass, "text-slate-500 drop-shadow-sm")} />
				</div>
			);
		case "rain":
		case "drizzle":
		case "thunderstorm":
			return (
				<div className="relative">
					<CloudRain
						className={cn(
							iconClass,
							weatherMain.toLowerCase() === "thunderstorm"
								? "text-purple-600 drop-shadow-sm"
								: "text-blue-500 drop-shadow-sm",
						)}
					/>
				</div>
			);
		case "snow":
			return (
				<div className="relative">
					<CloudSnow className={cn(iconClass, "text-blue-200 drop-shadow-sm")} />
				</div>
			);
		case "mist":
		case "fog":
		case "haze":
			return (
				<div className="relative">
					<Cloud className={cn(iconClass, "text-slate-400 drop-shadow-sm")} />
				</div>
			);
		default:
			return (
				<div className="relative">
					<Cloud className={cn(iconClass, "text-slate-500 drop-shadow-sm")} />
				</div>
			);
	}
}
