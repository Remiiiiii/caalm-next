import { type NextRequest, NextResponse } from "next/server";
import { requireContractCreateContext } from "@/lib/templates/require-org-permission";
import {
	buildWizardPdf,
	getWizardSession,
	parseWizardPayload,
	previewWizard,
	saveWizardSession,
} from "@/lib/templates/wizard.service";
import { uploadWizardDraftArtifact } from "@/lib/templates/blueprint-storage";

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
		if (!payload.blueprintId) {
			return NextResponse.json(
				{ error: "Choose an agreement blueprint first" },
				{ status: 400 },
			);
		}
		const assembly = await previewWizard({ orgId: auth.orgId, payload });
		const injectedClauses = assembly.sections
			.filter((section) => !section.skipped)
			.map((section) => ({
				title: section.title,
				body: section.body,
			}));
		const pdf = await buildWizardPdf(payload, injectedClauses, auth.orgId, {
			forPreview: true,
		});
		const fileId = await uploadWizardDraftArtifact({
			sessionId: session.$id,
			kind: "preview",
			fileName: `${payload.intake.contractName || "contract"}-preview.pdf`,
			buffer: pdf,
		});
		payload.draftPdfFileId = fileId;
		await saveWizardSession({
			session,
			orgId: auth.orgId,
			userId: auth.user.$id,
			payload,
			currentStep: session.currentStep,
		});
		return NextResponse.json({
			fileId,
			pdfUrl: `/api/contracts/wizard/${session.$id}/draft-file?kind=preview`,
		});
	} catch (error) {
		console.error("[contracts/wizard preview-pdf]", error);
		const message =
			error instanceof Error ? error.message : "Failed to build PDF preview";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
