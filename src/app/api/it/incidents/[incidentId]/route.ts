import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getIncidentById,
	updateIncident,
} from "@/lib/incidents/incident.repository";
import { requirePermission } from "@/lib/rbac/middleware";

const patchSchema = z.object({
	action: z.enum(["acknowledge", "assign", "resolve", "unresolve"]),
	assignedTo: z.string().optional(),
	resolutionNote: z.string().max(1000).optional(),
});

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ incidentId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.IT.MANAGE_INCIDENTS,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const { incidentId } = await params;
	const existing = await getIncidentById(incidentId);
	if (!existing) {
		return NextResponse.json({ error: "Incident not found" }, { status: 404 });
	}

	const body = await request.json().catch(() => null);
	const parsed = patchSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	const now = new Date().toISOString();
	const { action } = parsed.data;

	if (action === "acknowledge") {
		const incident = await updateIncident(incidentId, {
			status: existing.status === "new" ? "acknowledged" : existing.status,
			acknowledgedBy: user.$id,
			acknowledgedAt: now,
		});
		return NextResponse.json({ success: true, data: { incident } });
	}

	if (action === "assign") {
		if (!parsed.data.assignedTo) {
			return NextResponse.json(
				{ error: "assignedTo is required" },
				{ status: 400 },
			);
		}
		const incident = await updateIncident(incidentId, {
			assignedTo: parsed.data.assignedTo,
		});
		return NextResponse.json({ success: true, data: { incident } });
	}

	if (action === "unresolve") {
		const incident = await updateIncident(incidentId, {
			status: "acknowledged",
			resolvedBy: null,
			resolvedAt: null,
			resolutionNote: null,
			unresolvedBy: user.$id,
			unresolvedAt: now,
		});
		return NextResponse.json({ success: true, data: { incident } });
	}

	// resolve
	if (!parsed.data.resolutionNote?.trim()) {
		return NextResponse.json(
			{ error: "A resolution note is required" },
			{ status: 400 },
		);
	}
	const incident = await updateIncident(incidentId, {
		status: "resolved",
		resolvedBy: user.$id,
		resolvedAt: now,
		resolutionNote: parsed.data.resolutionNote.trim(),
	});
	return NextResponse.json({ success: true, data: { incident } });
}
