import { afterEach, describe, expect, it, vi } from "vitest";

describe("MEDIA_URLS", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("uses same-origin paths by default", async () => {
		vi.resetModules();
		const { MEDIA_URLS } = await import("./urls");
		expect(MEDIA_URLS.waveVideo).toBe("/assets/video/wave.mp4");
		expect(MEDIA_URLS.demoLandingPoster).toBe(
			"/assets/video/demo-screenshots/06-landing-hero.png",
		);
	});

	it("prefixes paths when NEXT_PUBLIC_MEDIA_BASE_URL is set", async () => {
		vi.stubEnv(
			"NEXT_PUBLIC_MEDIA_BASE_URL",
			"https://media.caalmsolutions.com/",
		);
		vi.resetModules();
		const { MEDIA_URLS } = await import("./urls");
		expect(MEDIA_URLS.demoTourWelcome).toBe(
			"https://media.caalmsolutions.com/assets/demo/tour/welcome.webp",
		);
	});
});
