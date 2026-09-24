/**
 * Marketing / demo media URLs.
 *
 * **Now (Option A):** Files under `public/assets/…` ship with the Vercel deploy and
 * are served from the site origin (Fast Data Transfer, not Vercel Blob). Large files
 * stay gitignored — copy them into `public/assets/video/` and
 * `public/assets/demo/tour/` on the machine that builds production (see `.gitignore`).
 *
 * **Override:** `NEXT_PUBLIC_MEDIA_BASE_URL` (no trailing slash) prefixes every path,
 * e.g. `https://media.caalmsolutions.com` after a future CDN move.
 *
 * **Long-term (revisit):** Cloudflare R2 + custom subdomain when deploy size or Hobby
 * FDT (~100 GB / 30 days) becomes tight. See `.cursor/rules/media-hosting.mdc`.
 */
const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(
	/\/$/,
	"",
);

function mediaPath(path: string): string {
	return MEDIA_BASE ? `${MEDIA_BASE}${path}` : path;
}

export const MEDIA_URLS = {
	waveVideo: mediaPath("/assets/video/wave.mp4"),
	demoLandingVideo: mediaPath("/assets/video/demo-landing.mp4"),
	demoLandingMobileVideo: mediaPath("/assets/video/caalm-demo-15s.mp4"),
	onboardingStepsVideo: mediaPath("/assets/video/onboarding-steps.mp4"),
	demoLandingPoster: mediaPath(
		"/assets/video/demo-screenshots/06-landing-hero.png",
	),
	demoTourWelcome: mediaPath("/assets/demo/tour/welcome.webp"),
	demoTourContracts: mediaPath("/assets/demo/tour/contracts.webp"),
	demoTourLicenses: mediaPath("/assets/demo/tour/licenses.webp"),
	demoTourAudits: mediaPath("/assets/demo/tour/audits.webp"),
	demoTourAnalytics: mediaPath("/assets/demo/tour/analytics.webp"),
} as const;
