import { type NextRequest, NextResponse } from "next/server";
import { requireContractCreateContext } from "@/lib/templates/require-org-permission";
import {
	getWizardSession,
	parseWizardPayload,
	previewWizard,
} from "@/lib/templates/wizard.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const auth = await requireContractCreateContext(request);
	if (!auth.ok) return auth.response;
	const { id } = await context.params;
	const session = await getWizardSession(id);
	if (
		!session ||
		session.orgId !== auth.orgId ||
		session.userId !== auth.user.$id
	) {
		return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const payload = parseWizardPayload(body.payload ?? session.payload);
		const assembly = await previewWizard({
			orgId: auth.orgId,
			payload,
		});
		return NextResponse.json({ assembly });
	} catch (error) {
		console.error("[contracts/wizard preview]", error);
		const message =
			error instanceof Error ? error.message : "Failed to preview assembly";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
