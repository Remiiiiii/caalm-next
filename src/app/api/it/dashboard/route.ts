/**
 * IT Dashboard API — connectivity + process signals only.
 * Does not invent host CPU, fake API request totals, or mock alerts.
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireITRole } from "@/lib/auth/it-guards";
import { createAdminClient } from "@/lib/appwrite";
import { formatUptime } from "@/lib/it/format-uptime";

type ServiceStatus = "up" | "down" | "degraded";

async function probeAppwrite(): Promise<{
	status: ServiceStatus;
	responseTimeMs: number | null;
	detail: string;
}> {
	const started = Date.now();
	try {
		const { databases } = await createAdminClient();
		await databases.list();
		return {
			status: "up",
			responseTimeMs: Date.now() - started,
			detail: "Appwrite API reachable",
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Appwrite probe failed";
		return {
			status: "down",
			responseTimeMs: Date.now() - started,
			detail: message.slice(0, 160),
		};
	}
}

export async function GET(request: NextRequest) {
	const roleCheck = await requireITRole(request);
	if (roleCheck) return roleCheck;

	try {
		const appwrite = await probeAppwrite();
		const memory = process.memoryUsage();
		const uptimeSeconds = Math.round(process.uptime());
		const uptimeLabel = formatUptime(uptimeSeconds);

		const services = [
			{
				name: "Appwrite",
				status: appwrite.status,
				responseTime: appwrite.responseTimeMs,
				detail: appwrite.detail,
			},
			{
				name: "App runtime",
				status: "up" as const,
				responseTime: null,
				detail: `Next.js process uptime ${uptimeLabel}`,
			},
		];

		const anyDown = services.some((s) => s.status === "down");
		const status = anyDown ? ("degraded" as const) : ("healthy" as const);

		const dashboardData = {
			/** Host CPU / fleet telemetry is not wired — never invent numbers. */
			telemetryConfigured: false,
			notice:
				"Host CPU, memory, and request telemetry are not configured. Showing Appwrite connectivity and this app process only.",
			systemHealth: {
				status,
				/** Intentionally null — we do not claim SLA uptime without monitoring. */
				uptime: null as number | null,
				services,
			},
			recentAlerts: [] as Array<{
				id: string;
				severity: "critical" | "warning" | "info";
				message: string;
				timestamp: string;
			}>,
			quickStats: {
				apiRequests: null as number | null,
				deployments: null as number | null,
				activeIncidents: null as number | null,
				systemLoad: null as number | null,
				/** Real Node heap for this process (not host RAM). */
				processHeapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10,
				processUptimeSeconds: uptimeSeconds,
				processUptimeLabel: uptimeLabel,
			},
			timestamp: new Date().toISOString(),
		};

		return NextResponse.json({
			success: true,
			data: dashboardData,
		});
	} catch (error) {
		console.error("[IT Dashboard API] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch IT dashboard data",
			},
			{ status: 500 },
		);
	}
}
