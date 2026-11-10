import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { parsePdfBuffer } from "@/lib/files/pdf-text";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(req: NextRequest) {
	try {
		const denied = await requirePermission(req, {
			permission: [
				PERMISSIONS.AI.DOCUMENT_ANALYSIS,
				PERMISSIONS.CONTRACTS.VIEW,
				PERMISSIONS.LICENSES.VIEW,
				PERMISSIONS.CALENDAR.VIEW_OWN,
			],
		});
		if (denied) return denied;

		const { fileUrl, fileName, pdfBase64 } = await req.json();

		let buffer: Buffer | null = null;

		// Prefer browser-uploaded bytes (works for cookie-gated draft URLs).
		if (typeof pdfBase64 === "string" && pdfBase64.trim()) {
			buffer = Buffer.from(pdfBase64, "base64");
		} else if (fileUrl) {
			const response = await fetch(fileUrl);
			if (!response.ok) {
				return NextResponse.json(
					{ error: `Failed to fetch PDF: ${response.status}` },
					{ status: 400 },
				);
			}
			buffer = Buffer.from(await response.arrayBuffer());
		} else {
			return NextResponse.json(
				{ error: "File URL or PDF bytes are required" },
				{ status: 400 },
			);
		}

		const result = await parsePdfBuffer(buffer, fileName);
		return NextResponse.json(result);
	} catch (error) {
		console.error("PDF extraction error:", error);
		return NextResponse.json(
			{ error: "Failed to extract PDF text" },
			{ status: 500 },
		);
	}
}

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [
			PERMISSIONS.AI.DOCUMENT_ANALYSIS,
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.LICENSES.VIEW,
			PERMISSIONS.CALENDAR.VIEW_OWN,
		],
	});
	if (denied) return denied;

	return NextResponse.json({ message: "PDF extraction endpoint" });
}
