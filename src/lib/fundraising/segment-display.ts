import type { LifecycleSegment } from "./constants";

const SEGMENT_BADGE: Record<
	LifecycleSegment,
	string
> = {
	Champion: "bg-green/10 text-green border-green/20",
	Loyal: "bg-blue/10 text-blue border-blue/20",
	New: "bg-blue/10 text-blue border-blue/20",
	"At-risk": "bg-orange/10 text-orange border-orange/20",
	Lapsed: "bg-red/10 text-red border-red/20",
	Lost: "bg-red/10 text-red border-red/20",
};

export function segmentBadgeClass(segment: string | undefined | null): string {
	if (!segment) {
		return "bg-slate-100 text-slate-600 border-slate-200";
	}
	return (
		SEGMENT_BADGE[segment as LifecycleSegment] ??
		"bg-slate-100 text-slate-600 border-slate-200"
	);
}

export function normalizeSegmentLabel(segment: string | undefined | null): string {
	if (!segment) return "Unknown";
	return segment;
}
