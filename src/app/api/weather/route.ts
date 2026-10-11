import { type NextRequest, NextResponse } from "next/server";
import { buildWeatherPayload } from "@/lib/weather/build-weather-payload";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

/**
 * Server-side weather: current conditions + 5-day forecast (aggregated to daily).
 * Protects OPENWEATHER_API_KEY.
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const lat = searchParams.get("lat");
		const lon = searchParams.get("lon");
		const city = searchParams.get("city");

		const apiKey = process.env.OPENWEATHER_API_KEY;

		if (!apiKey) {
			console.error("[SERVER] Weather API] OPENWEATHER_API_KEY not configured");
			return NextResponse.json(
				{
					success: false,
					error: "Weather API key not configured",
					message:
						"OPENWEATHER_API_KEY environment variable is not set. Please configure it in your environment variables.",
				},
				{ status: 500 },
			);
		}

		let cacheKey: string;
		let currentUrl: string;
		let forecastUrl: string | null = null;

		if (lat && lon) {
			cacheKey = `${CACHE_KEYS.weather.byCoords(lat, lon)}:v2`;
			const q = `lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
			currentUrl = `https://api.openweathermap.org/data/2.5/weather?${q}`;
			forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?${q}`;
		} else if (city) {
			cacheKey = `${CACHE_KEYS.weather.byCity(city)}:v2`;
			currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
				city,
			)}&appid=${apiKey}&units=imperial`;
		} else {
			return NextResponse.json(
				{
					success: false,
					error: "Missing location parameters",
					message: "Either lat/lon or city parameter is required",
				},
				{ status: 400 },
			);
		}

		const result = await CacheManager.withCache(
			"weather",
			cacheKey,
			async () => {
				const currentRes = await fetch(currentUrl, {
					next: { revalidate: 600 },
				});

				if (!currentRes.ok) {
					const errorData = await currentRes.json().catch(() => ({}));
					console.error("[SERVER] Weather API] OpenWeatherMap API error:", {
						status: currentRes.status,
						error: errorData,
					});
					throw new Error(errorData.message || "Weather service unavailable");
				}

				const current = await currentRes.json();

				let forecastList: unknown[] = [];
				let forecastFetchUrl = forecastUrl;
				if (
					!forecastFetchUrl &&
					current?.coord?.lat != null &&
					current?.coord?.lon != null
				) {
					const q = `lat=${current.coord.lat}&lon=${current.coord.lon}&appid=${apiKey}&units=imperial`;
					forecastFetchUrl = `https://api.openweathermap.org/data/2.5/forecast?${q}`;
				}

				if (forecastFetchUrl) {
					const forecastRes = await fetch(forecastFetchUrl, {
						next: { revalidate: 600 },
					});
					if (forecastRes.ok) {
						const forecastJson = await forecastRes.json();
						forecastList = Array.isArray(forecastJson?.list)
							? forecastJson.list
							: [];
					}
				}

				return {
					success: true,
					data: buildWeatherPayload(current, forecastList as never),
				};
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		console.error("[SERVER] Weather API] Error fetching weather:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
				message:
					error instanceof Error ? error.message : "Unknown error occurred",
			},
			{ status: 500 },
		);
	}
}
