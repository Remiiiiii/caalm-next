import { type NextRequest, NextResponse } from "next/server";
import { requireContractCreateContext } from "@/lib/templates/require-org-permission";
import {
	buildWizardDocx,
	getWizardSession,
	parseWizardPayload,
	previewWizard,
} from "@/lib/templates/wizard.service";
import { docxBufferToHtml } from "@/lib/templates/docx-preview";

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
		const payload = parseWizardPayload({
			...session.payload,
			...body,
			intake: { ...session.payload.intake, ...(body.intake || {}) },
			tokenValues: { ...session.payload.tokenValues, ...(body.tokenValues || {}) },
			customBlocks: body.customBlocks ?? session.payload.customBlocks,
		});
		if (!payload.blueprintId) {
			return NextResponse.json(
				{ error: "Choose an agreement blueprint first" },
				{ status: 400 },
			);
		}
		const assembly = await previewWizard({ orgId: auth.orgId, payload });
		const injected = assembly.sections
			.filter((section) => !section.skipped)
			.map((section) => `${section.title}\n\n${section.body}`);
		const docx = await buildWizardDocx(payload, injected, auth.orgId);
		const html = await docxBufferToHtml(docx);
		return NextResponse.json({ html });
	} catch (error) {
		console.error("[contracts/wizard preview-doc]", error);
		const message =
			error instanceof Error ? error.message : "Failed to preview document";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
