import { type NextRequest, NextResponse } from "next/server";
import { getOrganization } from "@/lib/rbac/organizations";
import { getBlueprint } from "@/lib/templates/blueprint-catalog";
import {
	downloadBlueprintFile,
	loadBlueprintSource,
} from "@/lib/templates/blueprint-storage";
import { docxBufferToHtml } from "@/lib/templates/docx-preview";
import { mergeDocxTemplate } from "@/lib/templates/merge-docx";
import { orgLetterheadValues } from "@/lib/templates/org-letterhead";
import { requireContractCreateContext } from "@/lib/templates/require-org-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const auth = await requireContractCreateContext(request);
	if (!auth.ok) return auth.response;
	const { id } = await context.params;
	const blueprint = getBlueprint(id);
	if (!blueprint) {
		return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
	}
	const kind = request.nextUrl.searchParams.get("kind") || "source";
	const fileId =
		kind === "thumbnail" ? blueprint.thumbnailFileId : blueprint.sourceFileId;
	const fileName =
		kind === "thumbnail" ? `${blueprint.id}.png` : blueprint.fileName;
	try {
		const buffer =
			kind === "html" || kind === "source"
				? await loadBlueprintSource({
						sourceFileId: blueprint.sourceFileId,
						fileName: blueprint.fileName,
					})
				: await downloadBlueprintFile(fileId);
		if (kind === "html") {
			const org = await getOrganization(auth.orgId);
			const withOrg = mergeDocxTemplate(
				buffer,
				orgLetterheadValues(org),
				{ keepMissing: true },
			);
			const html = await docxBufferToHtml(withOrg);
			return NextResponse.json({ html });
		}
		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				"Content-Type":
					kind === "thumbnail"
						? "image/png"
						: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"Content-Disposition": `inline; filename="${fileName}"`,
				"Cache-Control": "private, max-age=300",
			},
		});
	} catch (error) {
		console.error("[wizard blueprint file]", error);
		return NextResponse.json(
			{ error: "Blueprint file is not available yet" },
			{ status: 404 },
		);
	}
}
