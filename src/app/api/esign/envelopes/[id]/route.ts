import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getEnvelope,
	updateDraftEnvelope,
	type DraftEnvelopePatch,
} from "@/lib/esign/envelope-service";
import { EsignLinkError } from "@/lib/esign/errors";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.VIEW, PERMISSIONS.LICENSES.VIEW],
	});
	if (denied) return denied;

	const { id } = await context.params;
	const envelope = await getEnvelope(id);
	if (!envelope) {
		return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
	}
	return NextResponse.json({ envelope });
}

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { id } = await context.params;
	const envelope = await getEnvelope(id);
	if (!envelope) {
		return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
	}

	const permission =
		envelope.resourceType === "license"
			? PERMISSIONS.LICENSES.SIGN
			: PERMISSIONS.CONTRACTS.SIGN;
	const denied = await requirePermission(request, { permission });
	if (denied) return denied;

	const body = (await request.json()) as DraftEnvelopePatch;
	try {
		const next = await updateDraftEnvelope(id, body);
		return NextResponse.json({ envelope: next });
	} catch (error) {
		if (error instanceof EsignLinkError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}
		const message = error instanceof Error ? error.message : "Update failed";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
