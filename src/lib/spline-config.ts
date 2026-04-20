/**
 * Spline scene configuration
 * Uses local file from public folder (watermark removed)
 * To use hosted version instead, set NEXT_PUBLIC_SPLINE_SCENE_URL in .env.local
 */

export const getSplineSceneUrl = (): string | null => {
	if (typeof window === "undefined") return null;

	// Prefer local file (watermark removed) over hosted version
	// Use environment variable only if explicitly needed
	return process.env.NEXT_PUBLIC_SPLINE_SCENE_URL || "/scene.splinecode";
};
