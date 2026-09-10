/**
 * Large landing/demo media lives on Vercel Blob so every deploy does not
 * re-upload ~100MB+ of mp4/webp from `public/`.
 *
 * Re-upload (after changing a file locally):
 *   vercel blob put <file> --access public --pathname media/... --rw-token $BLOB_READ_WRITE_TOKEN
 */
const BLOB = "https://pbzguikxxqv1zlwl.public.blob.vercel-storage.com";

export const MEDIA_URLS = {
	waveVideo: `${BLOB}/media/video/wave.mp4`,
	demoLandingVideo: `${BLOB}/media/video/demo-landing.mp4`,
	demoLandingMobileVideo: `${BLOB}/media/video/caalm-demo-15s.mp4`,
	onboardingStepsVideo: `${BLOB}/media/video/onboarding-steps.mp4`,
	demoLandingPoster: `${BLOB}/media/video/demo-screenshots/06-landing-hero.png`,
	demoTourWelcome: `${BLOB}/media/demo/tour/welcome.webp`,
	demoTourContracts: `${BLOB}/media/demo/tour/contracts.webp`,
	demoTourLicenses: `${BLOB}/media/demo/tour/licenses.webp`,
	demoTourAudits: `${BLOB}/media/demo/tour/audits.webp`,
	demoTourAnalytics: `${BLOB}/media/demo/tour/analytics.webp`,
} as const;
