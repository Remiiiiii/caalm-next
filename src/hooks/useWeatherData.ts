"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

export type WeatherData = {
	name: string;
	main: {
		temp: number;
		feels_like: number;
		humidity: number;
	};
	weather: Array<{
		main: string;
		description: string;
		icon: string;
	}>;
	wind: {
		speed: number;
	};
};

type UseWeatherDataOptions = {
	location?: string;
	latitude?: number;
	longitude?: number;
};

type ResolvedLocation = {
	lat: number;
	lon: number;
	city: string;
};

const MIAMI: ResolvedLocation = {
	lat: 25.7617,
	lon: -80.1918,
	city: "Miami",
};

function buildWeatherUrl(resolved: ResolvedLocation): string {
	const params = new URLSearchParams();
	if (resolved.lat !== 0 && resolved.lon !== 0) {
		params.set("lat", String(resolved.lat));
		params.set("lon", String(resolved.lon));
	} else if (resolved.city) {
		params.set("city", resolved.city);
	}
	return `/api/weather?${params.toString()}`;
}

async function weatherFetcher(url: string): Promise<WeatherData> {
	const response = await fetch(url);
	const result = await response.json().catch(() => ({}));

	if (!response.ok || !result.success || !result.data) {
		throw new Error(
			result.message || result.error || "Failed to fetch weather data",
		);
	}

	return result.data as WeatherData;
}

function resolveFromProps(
	location?: string,
	latitude?: number,
	longitude?: number,
): ResolvedLocation | null {
	if (latitude && longitude) {
		return {
			lat: latitude,
			lon: longitude,
			city: location || "Current Location",
		};
	}
	if (location) {
		return { lat: 0, lon: 0, city: location };
	}
	return null;
}

export function useWeatherData({
	location,
	latitude,
	longitude,
}: UseWeatherDataOptions = {}) {
	const [resolved, setResolved] = useState<ResolvedLocation | null>(() =>
		resolveFromProps(location, latitude, longitude),
	);

	useEffect(() => {
		const fromProps = resolveFromProps(location, latitude, longitude);
		if (fromProps) {
			setResolved(fromProps);
			return;
		}

		if (!navigator.geolocation) {
			setResolved(MIAMI);
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setResolved({
					lat: position.coords.latitude,
					lon: position.coords.longitude,
					city: "Current Location",
				});
			},
			() => {
				setResolved(MIAMI);
			},
			{ timeout: 5000, enableHighAccuracy: false },
		);
	}, [location, latitude, longitude]);

	const url = resolved ? buildWeatherUrl(resolved) : null;
	const { data, error, isLoading, isValidating } = useSWR(url, weatherFetcher, {
		refreshInterval: 10 * 60 * 1000,
		revalidateOnFocus: true,
		dedupingInterval: 60 * 1000,
	});

	return {
		weatherData: data ?? null,
		loading: !resolved || (isLoading && !data),
		error: error
			? error instanceof Error
				? error.message
				: "Failed to load weather data"
			: null,
		userLocation: data?.name || resolved?.city || "Miami",
		isRefreshing: Boolean(isValidating && data),
	};
}
