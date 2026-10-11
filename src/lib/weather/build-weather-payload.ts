export type WeatherDailyDay = {
	date: string;
	label: string;
	high: number;
	low: number;
	main: string;
	icon: string;
};

export type WeatherPayload = {
	name: string;
	country: string | null;
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
	wind: { speed: number };
	/** 0–100 from nearest forecast slot; null if unavailable */
	precipChance: number | null;
	sunrise: number;
	sunset: number;
	/** Seconds offset from UTC (OpenWeather `timezone`) */
	timezone: number;
	tomorrowPrecipChance: number | null;
	daily: WeatherDailyDay[];
};

type OwmCurrent = {
	name?: string;
	timezone?: number;
	main?: { temp?: number; feels_like?: number; humidity?: number };
	weather?: Array<{ main?: string; description?: string; icon?: string }>;
	wind?: { speed?: number };
	sys?: { sunrise?: number; sunset?: number; country?: string };
	coord?: { lat?: number; lon?: number };
};

type OwmForecastItem = {
	dt: number;
	main?: { temp?: number; temp_min?: number; temp_max?: number };
	weather?: Array<{ main?: string; icon?: string }>;
	pop?: number;
};

function dayKey(unixSec: number, timezoneSec: number): string {
	const localMs = (unixSec + timezoneSec) * 1000;
	const d = new Date(localMs);
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, "0");
	const day = String(d.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function weekdayLabel(
	dateKey: string,
	todayKey: string,
	timezoneSec: number,
): string {
	if (dateKey === todayKey) return "Today";
	const [y, m, d] = dateKey.split("-").map(Number);
	const utcNoon = Date.UTC(y!, m! - 1, d!, 12, 0, 0) - timezoneSec * 1000;
	return new Date(utcNoon).toLocaleDateString("en-US", {
		weekday: "short",
		timeZone: "UTC",
	});
}

export function buildWeatherPayload(
	current: OwmCurrent,
	forecastList: OwmForecastItem[],
): WeatherPayload {
	const timezone = current.timezone ?? 0;
	const nowSec = Math.floor(Date.now() / 1000);
	const todayKey = dayKey(nowSec, timezone);

	const byDay = new Map<
		string,
		{
			high: number;
			low: number;
			main: string;
			icon: string;
			maxPop: number;
			noonScore: number;
		}
	>();

	for (const item of forecastList) {
		const key = dayKey(item.dt, timezone);
		const temp = item.main?.temp ?? 0;
		const high = item.main?.temp_max ?? temp;
		const low = item.main?.temp_min ?? temp;
		const pop = Math.round((item.pop ?? 0) * 100);
		const localHour = new Date((item.dt + timezone) * 1000).getUTCHours();
		const noonScore = Math.abs(localHour - 12);
		const prev = byDay.get(key);
		if (!prev) {
			byDay.set(key, {
				high,
				low,
				main: item.weather?.[0]?.main || "Clouds",
				icon: item.weather?.[0]?.icon || "02d",
				maxPop: pop,
				noonScore,
			});
			continue;
		}
		prev.high = Math.max(prev.high, high);
		prev.low = Math.min(prev.low, low);
		prev.maxPop = Math.max(prev.maxPop, pop);
		if (noonScore < prev.noonScore) {
			prev.noonScore = noonScore;
			prev.main = item.weather?.[0]?.main || prev.main;
			prev.icon = item.weather?.[0]?.icon || prev.icon;
		}
	}

	const sortedKeys = [...byDay.keys()].sort();
	const daily: WeatherDailyDay[] = sortedKeys.slice(0, 7).map((key) => {
		const day = byDay.get(key)!;
		return {
			date: key,
			label: weekdayLabel(key, todayKey, timezone),
			high: Math.round(day.high),
			low: Math.round(day.low),
			main: day.main,
			icon: day.icon,
		};
	});

	const nearest = [...forecastList].sort(
		(a, b) => Math.abs(a.dt - nowSec) - Math.abs(b.dt - nowSec),
	)[0];
	const precipChance =
		nearest?.pop != null ? Math.round(nearest.pop * 100) : null;

	const tomorrowKey = sortedKeys.find((k) => k > todayKey);
	const tomorrowPrecipChance =
		tomorrowKey != null ? (byDay.get(tomorrowKey)?.maxPop ?? null) : null;

	return {
		name: current.name || "Unknown",
		country: current.sys?.country || null,
		main: {
			temp: current.main?.temp ?? 0,
			feels_like: current.main?.feels_like ?? 0,
			humidity: current.main?.humidity ?? 0,
		},
		weather: (current.weather || []).map((w) => ({
			main: w.main || "Clouds",
			description: w.description || "",
			icon: w.icon || "02d",
		})),
		wind: { speed: current.wind?.speed ?? 0 },
		precipChance,
		sunrise: current.sys?.sunrise ?? 0,
		sunset: current.sys?.sunset ?? 0,
		timezone,
		tomorrowPrecipChance,
		daily,
	};
}
