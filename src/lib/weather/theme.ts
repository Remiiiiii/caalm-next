export type WeatherPeriod = "night" | "dawn" | "day" | "dusk";

export type WeatherScene = {
	period: WeatherPeriod;
	/** Full CSS background for the atmospheric card */
	background: string;
	/** Soft overlay glow (radial) */
	glow: string;
};

/**
 * Pick a scene from local clock vs sunrise/sunset + OpenWeather `main`.
 * Intentionally outside CAALM glass palette (dark atmospheric card).
 */
export function getWeatherScene(
	weatherMain: string,
	iconCode: string,
	nowSec: number,
	sunriseSec: number,
	sunsetSec: number,
): WeatherScene {
	const main = weatherMain.toLowerCase();
	const isNightIcon = iconCode?.endsWith("n") ?? false;

	let period: WeatherPeriod = "day";
	if (sunriseSec > 0 && sunsetSec > 0) {
		const dawnStart = sunriseSec - 45 * 60;
		const dawnEnd = sunriseSec + 45 * 60;
		const duskStart = sunsetSec - 45 * 60;
		const duskEnd = sunsetSec + 45 * 60;
		if (nowSec < dawnStart || nowSec >= duskEnd) period = "night";
		else if (nowSec < dawnEnd) period = "dawn";
		else if (nowSec >= duskStart) period = "dusk";
		else period = "day";
	} else if (isNightIcon) {
		period = "night";
	}

	const stormy =
		main === "thunderstorm" ||
		main === "rain" ||
		main === "drizzle" ||
		main === "snow";

	if (stormy && (period === "night" || period === "dusk")) {
		return {
			period,
			background:
				main === "thunderstorm"
					? "linear-gradient(160deg, #0a0618 0%, #1a1035 45%, #0d1528 100%)"
					: "linear-gradient(160deg, #0a1424 0%, #12253d 50%, #0c1a2e 100%)",
			glow:
				main === "thunderstorm"
					? "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(120,80,200,0.35), transparent 70%)"
					: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(60,100,160,0.3), transparent 70%)",
		};
	}

	if (stormy) {
		return {
			period,
			background:
				"linear-gradient(160deg, #3a4a5c 0%, #5a6d82 40%, #7a8fa3 100%)",
			glow: "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(200,220,240,0.35), transparent 70%)",
		};
	}

	switch (period) {
		case "night":
			return {
				period,
				background:
					"linear-gradient(160deg, #020b1a 0%, #0a1f3d 42%, #061528 100%)",
				glow: "radial-gradient(ellipse 80% 55% at 50% 42%, rgba(70,130,200,0.35), transparent 68%)",
			};
		case "dawn":
			return {
				period,
				background:
					"linear-gradient(160deg, #1a2744 0%, #c4785a 45%, #e8a06a 100%)",
				glow: "radial-gradient(ellipse 70% 50% at 50% 55%, rgba(255,200,140,0.4), transparent 70%)",
			};
		case "dusk":
			return {
				period,
				background:
					"linear-gradient(160deg, #1b1840 0%, #8b3a5c 40%, #e07a4a 100%)",
				glow: "radial-gradient(ellipse 70% 50% at 55% 45%, rgba(255,140,90,0.35), transparent 70%)",
			};
		default:
			return main === "clear"
				? {
						period,
						background:
							"linear-gradient(160deg, #3b82c4 0%, #6eb6e8 45%, #a8d4f0 100%)",
						glow: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(255,255,220,0.45), transparent 65%)",
					}
				: {
						period,
						background:
							"linear-gradient(160deg, #5b7a9a 0%, #7f9bb5 45%, #a8c0d4 100%)",
						glow: "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(255,255,255,0.25), transparent 70%)",
					};
	}
}
