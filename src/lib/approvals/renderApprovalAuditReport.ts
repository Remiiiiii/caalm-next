import { renderToStream } from "@react-pdf/renderer";
import { createElement } from "react";
import { ApprovalAuditReportDocument } from "@/lib/approvals/ApprovalAuditReportDocument";
import type { ApprovalAuditReportPayload } from "@/lib/approvals/approvalAuditReportPayload";

export class ApprovalReportRenderError extends Error {
	status: number;

	constructor(message: string, status = 500) {
		super(message);
		this.name = "ApprovalReportRenderError";
		this.status = status;
	}
}

export async function renderApprovalAuditPdf(
	payload: ApprovalAuditReportPayload,
): Promise<Buffer> {
	try {
		const document = createElement(ApprovalAuditReportDocument, { payload });
		const stream = await renderToStream(document as never);
		const chunks: Buffer[] = [];
		for await (const chunk of stream) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		}
		return Buffer.concat(chunks);
	} catch (error) {
		throw new ApprovalReportRenderError(
			error instanceof Error
				? error.message
				: "Failed to generate the approval report.",
			500,
		);
	}
}
