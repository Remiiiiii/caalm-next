"use client";

import { Cloud, Droplets, MapPin, Wind } from "lucide-react";
import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWeatherData } from "@/hooks/useWeatherData";
import { cn } from "@/lib/utils";
import {
	formatTemperature,
	formatWindSpeed,
	getWeatherIcon,
} from "@/lib/weather/icons";

interface WeatherWidgetProps {
	location?: string;
	latitude?: number;
	longitude?: number;
	/** Auto-height for the briefing sheet; fixed height was for the carousel. */
	embedded?: boolean;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({
	location,
	latitude,
	longitude,
	embedded = false,
}) => {
	const { weatherData, loading, error, userLocation, isRefreshing } =
		useWeatherData({ location, latitude, longitude });

	const heightClass = embedded
		? "h-auto"
		: "h-[200px] sm:h-[250px] lg:h-[300px]";

	if (loading) {
		return (
			<Card
				className={cn(
					"w-full glass-card overflow-hidden",
					embedded ? "h-auto" : "h-[200px] sm:h-[250px] lg:h-[290px]",
				)}
			>
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-6 px-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold text-slate-800 mb-1">
								{userLocation}
							</CardTitle>
							<p className="text-xs text-slate-600">
								{new Date().toLocaleDateString("en-US", {
									weekday: "short",
									month: "short",
									day: "numeric",
								})}
							</p>
						</div>
						<div className="text-right">
							<p className="text-xs text-slate-500">Loading</p>
							<p className="text-xs text-slate-600 font-medium">...</p>
						</div>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-4">
					<div className="flex items-center justify-center h-24">
						<div className="flex flex-col items-center gap-3">
							<div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600"></div>
							<p className="text-xs text-slate-500 font-medium">
								Fetching weather data...
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card
				className={cn(
					"w-full glass-card overflow-hidden",
					embedded ? "h-auto" : "h-[200px] sm:h-[250px] lg:h-[290px]",
				)}
			>
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-6 px-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold text-slate-800 mb-1">
								{userLocation}
							</CardTitle>
							<p className="text-xs text-slate-600">
								{new Date().toLocaleDateString("en-US", {
									weekday: "short",
									month: "short",
									day: "numeric",
								})}
							</p>
						</div>
						<div className="text-right">
							<p className="text-xs text-slate-500">Status</p>
							<p className="text-xs text-red font-medium">Offline</p>
						</div>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-4">
					<div className="flex flex-col items-center justify-center h-24 gap-3">
						<div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
							<Cloud className="h-6 w-6 text-red-400" />
						</div>
						<div className="text-center">
							<p className="text-sm font-medium text-slate-700">
								Weather Unavailable
							</p>
							<p className="text-xs text-slate-500">Check your connection</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!weatherData) return null;

	return (
		<Card
			className={cn(
				"glass-card w-full flex flex-col overflow-hidden",
				heightClass,
			)}
		>
			<div className="glass-card-cap" />
			<CardHeader className="pb-3 pt-6 px-4 flex-shrink-0">
				<div className="flex items-center justify-between">
					<div>
						<div className="flex items-center gap-1">
							<MapPin className="h-4 w-4 text-[#0f5384]" />
							<CardTitle className="text-sm font-semibold sidebar-gradient-text mb-1">
								{weatherData.name}
							</CardTitle>
						</div>
						<p className="text-xs text-slate-600">
							{new Date().toLocaleDateString("en-US", {
								weekday: "short",
								month: "short",
								day: "numeric",
							})}
						</p>
					</div>
					<div className="text-right">
						<p className="text-xs text-slate-500">Updated</p>
						<p className="text-xs text-slate-600 font-medium">
							{new Date().toLocaleTimeString("en-US", {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</p>
					</div>
				</div>
			</CardHeader>

			<CardContent className="px-4 pb-2 flex-1 flex flex-col min-h-0">
				<div className="space-y-4 flex-1">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="relative">
								{getWeatherIcon(
									weatherData.weather[0].main,
									weatherData.weather[0].icon,
								)}
							</div>
							<div>
								<div className="text-3xl font-bold sidebar-gradient-text tracking-tight">
									{formatTemperature(weatherData.main.temp)}
								</div>
								<div className="text-sm text-slate-600 capitalize font-medium">
									{weatherData.weather[0].description}
								</div>
							</div>
						</div>

						<div className="text-right bg-white/30 rounded-lg px-3 py-1 backdrop-blur-sm">
							<div className="text-xs text-slate-500 font-medium">
								Feels like
							</div>
							<div className="text-lg font-semibold text-slate-700">
								{formatTemperature(weatherData.main.feels_like)}
							</div>
						</div>
					</div>
					<div className="h-px bg-slate-300"></div>
					<div className="grid grid-cols-2 gap-2">
						<div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-blue/10 rounded-lg flex items-center justify-center">
									<Droplets className="h-4 w-4 text-[#0f5384]" />
								</div>
								<div>
									<div className="text-xs text-slate-500 font-medium">
										Humidity
									</div>
									<div className="text-sm font-bold text-slate-700">
										{weatherData.main.humidity}%
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
									<Wind className="h-4 w-4 text-[#0f5384]" />
								</div>
								<div>
									<div className="text-xs text-slate-500 font-medium">Wind</div>
									<div className="text-sm font-bold text-slate-700">
										{formatWindSpeed(weatherData.wind.speed)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-3 border-t border-white/20 flex-shrink-0 -translate-y-0.5">
					<div className="flex items-center justify-center">
						<div className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20 min-w-[140px]">
							<div
								className={`w-2 h-2 rounded-full ${
									isRefreshing
										? "bg-blue-400 animate-pulse"
										: "bg-green animate-pulse"
								}`}
							></div>
							<span className="text-xs text-slate-600 font-medium">
								{isRefreshing ? "Updating..." : "Live Weather Data"}
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default WeatherWidget;
