import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	PILOT_MONTH_OPTIONS,
	type PilotMonths,
} from "@/lib/billing/entitlements";
import { requirePermission } from "@/lib/rbac/middleware";
import { startOrgPilot } from "@/lib/stripe/billing";
import { logAuditEvent } from "@/lib/services/audit-logger";

const bodySchema = z.object({
	orgId: z.string().min(1),
	tier: z.enum(["starter", "growth", "enterprise"]),
	months: z.number().int().refine(
		(m): m is PilotMonths =>
			(PILOT_MONTH_OPTIONS as readonly number[]).includes(m),
		{ message: "months must be 3, 4, 5, or 6" },
	),
});

/**
 * Start a free pilot for an org. Platform staff only — customers cannot
 * self-grant free access.
 */
export async function POST(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.PLATFORM.SYSTEM_SETTINGS,
	});
	if (permissionCheck) return permissionCheck;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = bodySchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid request", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	try {
		const org = await startOrgPilot(parsed.data);
		await logAuditEvent({
			event_id: `pilot_start_${org.$id}`,
			event_title: `Pilot started: ${org.name}`,
			action: "create",
			source: "caalm",
			user_id: user.$id,
			user_name:
				(user as { fullName?: string }).fullName || user.email || "unknown",
			user_email: user.email || "",
			status: "success",
			orgId: org.$id,
			module: "billing",
			target_type: "organization",
			target_id: org.$id,
			target_label: org.name,
			summary: `Pilot (${parsed.data.months} mo, ${parsed.data.tier}) started by ${user.email}`,
		}).catch(() => undefined);

		return NextResponse.json({
			orgId: org.$id,
			billingStatus: org.billingStatus,
			subscriptionTier: org.subscriptionTier,
			pilotEndsAt: org.currentPeriodEnd,
			limits: org.settings,
		});
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to start pilot";
		console.error("[billing/pilot]", error);
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
