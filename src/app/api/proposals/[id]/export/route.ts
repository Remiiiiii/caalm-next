import { renderToStream } from "@react-pdf/renderer";
import { type NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { PERMISSIONS } from "@/constants/permissions";
import { getOrganization } from "@/lib/rbac/organizations";
import { ProposalPdfDocument } from "@/lib/proposals/pdf-document";
import {
	actorName,
	requireProposalOrgContext,
} from "@/lib/proposals/request-context";
import { loadProposalWorkspace } from "@/lib/proposals/service";
import { proposalToWordHtml } from "@/lib/proposals/word-export";
import { logAuditEvent } from "@/lib/services/audit-logger";

type RouteContext = { params: Promise<{ id: string }> };

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireProposalOrgContext(
		request,
		PERMISSIONS.PROPOSALS.EXPORT,
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;
	const format = request.nextUrl.searchParams.get("format") || "pdf";
	try {
		const workspace = await loadProposalWorkspace(id, ctx.orgId);
		const org = await getOrganization(ctx.orgId);
		const orgName = org?.name || "Organization";
		const slug = workspace.proposal.title.replace(/[^\w]+/g, "-").slice(0, 40);
		const writeExportAudit = () =>
			logAuditEvent({
				event_id: `proposal_export_${workspace.proposal.$id}_${format}`,
				event_title: `Exported ${workspace.proposal.title}`,
				action: "export",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: actorName(ctx.user),
				user_email: ctx.user.email || "",
				orgId: ctx.orgId,
				status: "success",
				module: "contracts",
				target_type: "proposal",
				target_id: workspace.proposal.$id,
				target_label: workspace.proposal.title,
				summary: `${actorName(ctx.user)} exported ${workspace.proposal.title} as ${format}`,
			});
		if (format === "docx" || format === "doc") {
			const html = proposalToWordHtml({
				orgName,
				proposal: workspace.proposal,
				requirements: workspace.requirements,
				sections: workspace.sections,
			});
			await writeExportAudit();
			return new NextResponse(html, {
				headers: {
					"Content-Type": "application/msword",
					"Content-Disposition": `attachment; filename="${slug}.doc"`,
				},
			});
		}
		const stream = await renderToStream(
			createElement(ProposalPdfDocument, {
				orgName,
				proposal: workspace.proposal,
				requirements: workspace.requirements,
				sections: workspace.sections,
			}) as never,
		);
		const buffer = await streamToBuffer(
			stream as unknown as NodeJS.ReadableStream,
		);
		await writeExportAudit();
		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${slug}.pdf"`,
			},
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to export proposal";
		const status = message.includes("not found") ? 404 : 500;
		console.error("[SERVER] GET /api/proposals/[id]/export:", error);
		return NextResponse.json({ error: message }, { status });
	}
}
