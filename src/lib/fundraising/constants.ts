/** Default org setting until nonprofit settings table exists (3.3). */
export const DEFAULT_LAPSE_DAYS = 365;

export const LIFECYCLE_SEGMENTS = [
	"Champion",
	"Loyal",
	"New",
	"At-risk",
	"Lapsed",
	"Lost",
] as const;

export type LifecycleSegment = (typeof LIFECYCLE_SEGMENTS)[number];
