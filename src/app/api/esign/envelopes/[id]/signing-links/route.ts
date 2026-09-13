import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getEnvelope,
	recipientSigningLinks,
} from "@/lib/esign/envelope-service";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
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

	return NextResponse.json({ links: recipientSigningLinks(envelope) });
}
