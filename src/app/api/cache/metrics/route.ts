import { type NextRequest, NextResponse } from "next/server";
import {
	getAggregatedCacheMetrics,
	getCacheMetrics,
} from "@/lib/services/cache-metrics";

/**
 * GET /api/cache/metrics
 * Returns cache performance metrics
 * Query params:
 *   - key: Optional specific cache key to get metrics for
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const key = searchParams.get("key");

		if (key) {
			// Return metrics for specific key
			const metrics = getCacheMetrics(key);
			return NextResponse.json({
				success: true,
				key,
				metrics,
			});
		}

		// Return aggregated metrics
		const aggregated = getAggregatedCacheMetrics();
		const allMetrics = getCacheMetrics();

		return NextResponse.json({
			success: true,
			aggregated,
			byKey: allMetrics,
		});
	} catch (error) {
		console.error("Error fetching cache metrics:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch cache metrics",
			},
			{ status: 500 },
		);
	}
}
