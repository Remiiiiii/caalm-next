/**
 * Admin API endpoint for rate limit metrics
 * Provides monitoring dashboard data
 */

import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { rateLimitMonitoring } from "@/lib/services/rate-limit-monitoring";
import { penaltyService } from "@/lib/services/rate-limiter-penalties";

/**
 * GET /api/admin/rate-limits/metrics
 * Get rate limit metrics and statistics
 */
export async function GET(request: NextRequest) {
	try {
		// Check authentication
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Check admin permissions - use AUDIT.VIEW since rate limit monitoring is similar to audit logs
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.AUDIT.VIEW,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		// Get query parameters
		const { searchParams } = new URL(request.url);
		const endpoint = searchParams.get("endpoint") || undefined;
		const identifier = searchParams.get("identifier") || undefined;

		// Get metrics
		const metrics = await rateLimitMonitoring.getMetrics();
		const endpointStats = await rateLimitMonitoring.getEndpointStats(endpoint);

		// Get violation stats if identifier provided
		let violationStats = null;
		if (identifier) {
			violationStats = await penaltyService.getViolationStats(identifier);
		}

		// Calculate efficiency metrics
		const efficiency =
			metrics.totalRequests > 0
				? ((metrics.totalRequests - metrics.blockedRequests) /
						metrics.totalRequests) *
					100
				: 100;

		return NextResponse.json({
			success: true,
			data: {
				summary: {
					totalRequests: metrics.totalRequests,
					blockedRequests: metrics.blockedRequests,
					violations: metrics.violations,
					efficiency: `${efficiency.toFixed(2)}%`,
					averageLatency: `${metrics.averageLatency.toFixed(2)}ms`,
				},
				topViolators: metrics.topViolators,
				endpointStats,
				violationStats,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Error fetching rate limit metrics:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json(
			{
				error: "Failed to fetch rate limit metrics",
				details:
					process.env.NODE_ENV === "development" ? errorMessage : undefined,
			},
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/admin/rate-limits/metrics
 * Reset rate limit metrics
 */
export async function DELETE(request: NextRequest) {
	try {
		// Check authentication
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Check admin permissions - use AUDIT.VIEW since rate limit monitoring is similar to audit logs
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.AUDIT.VIEW,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		// Reset metrics
		await rateLimitMonitoring.resetMetrics();

		return NextResponse.json({
			success: true,
			message: "Rate limit metrics reset successfully",
		});
	} catch (error) {
		console.error("Error resetting rate limit metrics:", error);
		return NextResponse.json(
			{ error: "Failed to reset rate limit metrics" },
			{ status: 500 },
		);
	}
}
