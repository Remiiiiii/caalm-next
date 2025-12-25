/**
 * Spline scene configuration
 * Store the Spline scene URL in an environment variable:
 * NEXT_PUBLIC_SPLINE_SCENE_URL=https://prod.spline.design/...
 */

export const getSplineSceneUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  return process.env.NEXT_PUBLIC_SPLINE_SCENE_URL || null;
};
