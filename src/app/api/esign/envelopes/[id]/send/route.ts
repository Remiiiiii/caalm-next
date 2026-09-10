import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getEnvelope, sendEnvelope } from "@/lib/esign/envelope-service";
import { EsignLinkError } from "@/lib/esign/errors";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(
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

	try {
		const sent = await sendEnvelope(id);
		return NextResponse.json({ envelope: sent });
	} catch (error) {
		const missing = (error as { missing?: Array<{ email: string; name: string }> })
			.missing;
		if (missing?.length) {
			return NextResponse.json(
				{
					error: "The following signers are missing signature fields",
					missing,
				},
				{ status: 400 },
			);
		}
		if (error instanceof EsignLinkError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}
		const message = error instanceof Error ? error.message : "Send failed";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
