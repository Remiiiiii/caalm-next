import { type NextRequest, NextResponse } from "next/server";
import { getTemplateById } from "@/lib/templates/contract-template.service";
import { injectTemplateSlots } from "@/lib/templates/assemble-contract";
import {
	downloadBlueprintFile,
	uploadWizardDraftArtifact,
} from "@/lib/templates/blueprint-storage";
import { requireContractCreateContext } from "@/lib/templates/require-org-permission";
import {
	getWizardSession,
	saveWizardSession,
} from "@/lib/templates/wizard.service";
import { isBlueprintId } from "@/lib/templates/blueprint-catalog";
import type { BlueprintId } from "@/types/contract-templates";

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

	const body = await request.json().catch(() => ({}));
	const templateId = String(body.templateId || "").trim();
	if (!templateId) {
		return NextResponse.json({ error: "templateId is required" }, { status: 400 });
	}

	const template = await getTemplateById(templateId);
	if (!template || template.orgId !== auth.orgId) {
		return NextResponse.json({ error: "Template not found" }, { status: 404 });
	}
	if (template.status !== "published") {
		return NextResponse.json(
			{ error: "Only published templates can start a wizard" },
			{ status: 400 },
		);
	}

	let draftDocxFileId = session.payload.draftDocxFileId;
	if (template.docxFileId) {
		const buffer = await downloadBlueprintFile(template.docxFileId);
		draftDocxFileId = await uploadWizardDraftArtifact({
			sessionId: session.$id,
			kind: "draft",
			buffer,
			fileName: `${template.name}-draft.docx`,
		});
	}

	const blueprintId: BlueprintId | null =
		template.blueprintId && isBlueprintId(template.blueprintId)
			? template.blueprintId
			: template.docxFileId
				? "mou"
				: null;

	const nextPayload = {
		...session.payload,
		startPath: "template" as const,
		templateId: template.$id,
		blueprintId,
		draftDocxFileId,
		intake: {
			...session.payload.intake,
			contractType: template.contractType,
		},
		sections: injectTemplateSlots(
			[],
			template.clauseSlots,
			template.$id,
		),
	};

	const updated = await saveWizardSession({
		session,
		orgId: auth.orgId,
		userId: auth.user.$id,
		payload: nextPayload,
		currentStep: 1,
	});

	return NextResponse.json({ session: updated });
}
