import { type NextRequest, NextResponse } from "next/server";
import { downloadBlueprintFile } from "@/lib/templates/blueprint-storage";
import { requireContractCreateContext } from "@/lib/templates/require-org-permission";
import { getWizardSession } from "@/lib/templates/wizard.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
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

	const kind = request.nextUrl.searchParams.get("kind") || "preview";
	const fileId =
		kind === "draft"
			? session.payload.draftDocxFileId
			: session.payload.draftPdfFileId;
	if (!fileId) {
		return NextResponse.json({ error: "Draft file not saved yet" }, { status: 404 });
	}
	try {
		const buffer = await downloadBlueprintFile(fileId);
		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				"Content-Type":
					kind === "draft"
						? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
						: "application/pdf",
				"Content-Disposition": `inline; filename="${kind === "draft" ? "draft.docx" : "preview.pdf"}"`,
			},
		});
	} catch (error) {
		console.error("[wizard draft-file]", error);
		return NextResponse.json({ error: "Draft file not found" }, { status: 404 });
	}
}
