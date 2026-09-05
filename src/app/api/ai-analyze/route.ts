import { type NextRequest, NextResponse } from "next/server";
import {
	analyzeContractDocument,
	answerContractQuestion,
} from "@/lib/ai/contract-assistant";
import type { PdfPageText } from "@/lib/ai/contract-assistant.types";
import {
	analyzeDocument,
	answerQuestion,
	extractDocumentContent,
} from "@/lib/ai/gemini";

function normalizePageTexts(raw: unknown): PdfPageText[] | undefined {
	if (!Array.isArray(raw)) return undefined;
	const pages = raw
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const row = item as Record<string, unknown>;
			const page = Number(row.page);
			const text = typeof row.text === "string" ? row.text : "";
			if (!Number.isInteger(page) || page <= 0) return null;
			return { page, text };
		})
		.filter((item): item is PdfPageText => item !== null);
	return pages.length ? pages : undefined;
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			action,
			fileName,
			fileType,
			fileContent,
			fileUrl,
			question,
			previousContext,
			context,
			pageTexts: rawPageTexts,
		} = body;
		const pageTexts = normalizePageTexts(rawPageTexts);

		console.log("AI API Request:", {
			action,
			fileName,
			fileType,
			context,
			hasContent: !!fileContent,
			contentLength: fileContent?.length || 0,
			pageCount: pageTexts?.length || 0,
			hasUrl: !!fileUrl,
		});

		if (context === "contract") {
			if (action === "analyze") {
				const result = await analyzeContractDocument({
					fileName: fileName || "Contract",
					pageTexts,
					fileContent,
				});
				return NextResponse.json({
					...result,
					summary: result.summaryMarkdown,
					answer: result.summaryMarkdown,
				});
			}
			if (action === "question") {
				const result = await answerContractQuestion({
					question,
					fileName: fileName || "Contract",
					pageTexts,
					fileContent,
					previousContext,
				});
				return NextResponse.json({
					...result,
					answer: result.answerMarkdown,
					confidence: 0.85,
				});
			}
			return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		// Extract file content if not provided but URL is available
		let extractedContent = fileContent;
		if (!fileContent && fileUrl) {
			console.log("Extracting content from file URL...");
			try {
				if (fileType.toLowerCase() === "pdf") {
					const extractResponse = await fetch(
						`${
							process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
						}/api/extract-pdf-text`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ fileUrl, fileName }),
						},
					);

					if (!extractResponse.ok) {
						throw new Error(`PDF extraction failed: ${extractResponse.status}`);
					}

					const extractResult = await extractResponse.json();
					extractedContent =
						extractResult.text || "No text content extracted from PDF";
				} else {
					extractedContent = await extractDocumentContent(fileUrl, fileType);
				}
			} catch (extractError) {
				console.error("Content extraction failed for:", {
					fileUrl,
					fileType,
					errorMessage:
						extractError instanceof Error
							? extractError.message
							: "Unknown error",
				});
				extractedContent = `Unable to extract content from ${fileType} file. Error: ${
					extractError instanceof Error ? extractError.message : "Unknown error"
				}`;
			}
		} else if (fileContent) {
			extractedContent = fileContent;
		}

		if (action === "analyze") {
			const result = await analyzeDocument(
				fileName,
				fileType,
				extractedContent,
				fileUrl,
			);
			return NextResponse.json(result);
		} else if (action === "question") {
			const result = await answerQuestion(
				question,
				fileName,
				fileType,
				extractedContent,
				fileUrl,
				previousContext,
			);
			return NextResponse.json(result);
		} else {
			return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("AI API Error:", error);
		return NextResponse.json(
			{
				error: "AI analysis failed",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
