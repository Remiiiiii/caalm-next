import { ID } from "node-appwrite";
import { getOrganization } from "@/lib/rbac/organizations";
import { getBlueprint } from "@/lib/templates/blueprint-catalog";
import {
	loadBlueprintSource,
	uploadNamedBlueprintFile,
} from "@/lib/templates/blueprint-storage";
import { mergeDocxTemplate } from "@/lib/templates/merge-docx";
import { orgLetterheadValues } from "@/lib/templates/org-letterhead";
import type { BlueprintId } from "@/types/contract-templates";

/** Base blueprint for org agreements created from scratch (letterhead + signatures). */
export const SCRATCH_AGREEMENT_BLUEPRINT_ID: BlueprintId = "mou";

export async function buildScratchAgreementDocx(orgId: string): Promise<Buffer> {
	const blueprint = getBlueprint(SCRATCH_AGREEMENT_BLUEPRINT_ID);
	if (!blueprint) {
		throw new Error("Scratch agreement blueprint is not configured");
	}
	const org = await getOrganization(orgId);
	const source = await loadBlueprintSource({
		sourceFileId: blueprint.sourceFileId,
		fileName: blueprint.fileName,
	});
	return mergeDocxTemplate(source, orgLetterheadValues(org), {
		keepMissing: true,
	});
}

export async function persistScratchAgreementDocx(input: {
	orgId: string;
	templateId: string;
}): Promise<string> {
	const buffer = await buildScratchAgreementDocx(input.orgId);
	const fileId = `ct${input.templateId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 28)}`;
	return uploadNamedBlueprintFile({
		fileId: fileId.slice(0, 36),
		fileName: `${input.templateId}-agreement.docx`,
		buffer,
	});
}

export function newTemplateRowId(): string {
	return ID.unique();
}
