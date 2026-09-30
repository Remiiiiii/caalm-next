import { type NextRequest, NextResponse } from "next/server";
import { getTemplateById } from "@/lib/templates/contract-template.service";
import { downloadBlueprintFile } from "@/lib/templates/blueprint-storage";
import { docxBufferToHtml } from "@/lib/templates/docx-preview";
import { resolveOrgContext } from "@/lib/templates/require-org-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const auth = await resolveOrgContext();
	if (!auth.ok) return auth.response;
	const { id } = await context.params;
	const template = await getTemplateById(id);
	if (!template || template.orgId !== auth.orgId) {
		return NextResponse.json({ error: "Template not found" }, { status: 404 });
	}
	if (!template.docxFileId) {
		return NextResponse.json(
			{ error: "This template has no agreement document yet" },
			{ status: 404 },
		);
	}
	const kind = request.nextUrl.searchParams.get("kind") || "html";
	try {
		const buffer = await downloadBlueprintFile(template.docxFileId);
		if (kind === "html") {
			const html = await docxBufferToHtml(buffer);
			return NextResponse.json({ html });
		}
		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				"Content-Type":
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"Content-Disposition": `inline; filename="${template.name}.docx"`,
			},
		});
	} catch (error) {
		console.error("[contract-template file]", error);
		return NextResponse.json(
			{ error: "Agreement file is not available" },
			{ status: 404 },
		);
	}
}
