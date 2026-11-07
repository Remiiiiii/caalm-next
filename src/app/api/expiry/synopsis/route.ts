import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { analyzeDocument } from "@/lib/ai/gemini";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";

/** Minimal pdf.js text extraction — same library the full extract-pdf-text route uses. */
async function extractPdfText(buffer: Buffer): Promise<string> {
	try {
		const pdfjsLib = await import("pdfjs-dist");
		pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
		const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
		const pages: string[] = [];
		for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
			const page = await pdf.getPage(pageNum);
			const textContent = await page.getTextContent();
			pages.push(
				textContent.items
					.map((item) => ("str" in item ? item.str || "" : ""))
					.join(" "),
			);
		}
		return pages.join("\n\n").trim();
	} catch {
		return "";
	}
}

/**
 * Lazy-generate + cache: the expiry modal's "more details" file view calls this
 * once per record (when it has no stored synopsis yet), then never again.
 */
export async function POST(request: NextRequest) {
	try {
		const denied = await requirePermission(request, {
			permission: [PERMISSIONS.AI.DOCUMENT_ANALYSIS, PERMISSIONS.AI.CHAT],
		});
		if (denied) return denied;

		const { entityType, entityId, fileUrl } = await request.json();
		if (
			(entityType !== "contract" && entityType !== "license") ||
			!entityId ||
			!fileUrl
		) {
			return NextResponse.json({ error: "Invalid request" }, { status: 400 });
		}

		let extractedContent = "";
		try {
			const response = await fetch(fileUrl, { credentials: "include" });
			if (response.ok) {
				const buffer = Buffer.from(await response.arrayBuffer());
				extractedContent = await extractPdfText(buffer);
			}
		} catch {
			// Fall through — analyzeDocument still has fileUrl as context.
		}

		const result = await analyzeDocument(
			entityId,
			"pdf",
			extractedContent || undefined,
			fileUrl,
		);

		const aiSynopsisGeneratedAt = new Date().toISOString();
		// shortcut: hard-capped to the smaller of the two collection column sizes
		// (licenses.aiSynopsis is 2000 chars) rather than per-collection limits.
		const aiSynopsis =
			result.summary.length > 2000
				? `${result.summary.slice(0, 1999)}…`
				: result.summary;
		const { tablesDB } = await createAdminClient();
		const tableId =
			entityType === "contract"
				? appwriteConfig.filesCollectionId
				: appwriteConfig.licensesCollectionId;
		if (appwriteConfig.databaseId && tableId) {
			await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId,
				tableId,
				rowId: entityId,
				data: { aiSynopsis, aiSynopsisGeneratedAt },
			});
		}

		return NextResponse.json({
			aiSynopsis,
			aiSynopsisGeneratedAt,
		});
	} catch (error) {
		console.error("Expiry synopsis error:", error);
		return NextResponse.json(
			{ error: "Failed to generate synopsis" },
			{ status: 500 },
		);
	}
}
