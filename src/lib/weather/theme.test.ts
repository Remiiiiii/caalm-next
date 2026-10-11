import { describe, expect, it } from "vitest";
import { getWeatherScene } from "./theme";

describe("getWeatherScene", () => {
	const sunrise = 1_700_000_000;
	const sunset = sunrise + 12 * 3600;

	it("uses night navy when after sunset", () => {
		const scene = getWeatherScene(
			"Clouds",
			"02n",
			sunset + 3600,
			sunrise,
			sunset,
		);
		expect(scene.period).toBe("night");
		expect(scene.background).toContain("#020b1a");
	});

	it("uses clear-day blues when sunny midday", () => {
		const scene = getWeatherScene(
			"Clear",
			"01d",
			sunrise + 6 * 3600,
			sunrise,
			sunset,
		);
		expect(scene.period).toBe("day");
		expect(scene.background).toContain("#3b82c4");
	});
});
