import { type NextRequest, NextResponse } from "next/server";

export type PdfPageText = { page: number; text: string };

function combinePageTexts(pageTexts: PdfPageText[]): string {
	return pageTexts
		.map((entry) => `[[PAGE:${entry.page}]]\n${entry.text}`)
		.join("\n\n")
		.trim();
}

async function parsePdfBuffer(buffer: Buffer, fileName?: string) {
	// Prefer PDF.js so we can keep per-page spans for citations.
	try {
		const pdfjsLib = await import("pdfjs-dist");
		pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
		const loadingTask = pdfjsLib.getDocument({ data: buffer });
		const pdf = await loadingTask.promise;
		const pageTexts: PdfPageText[] = [];
		for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
			const page = await pdf.getPage(pageNum);
			const textContent = await page.getTextContent();
			const pageText = textContent.items
				.map((item) => ("str" in item ? item.str || "" : ""))
				.join(" ")
				.trim();
			pageTexts.push({ page: pageNum, text: pageText });
		}
		const text = combinePageTexts(pageTexts);
		if (text) {
			return {
				text,
				pages: pdf.numPages,
				pageTexts,
				info: { numPages: pdf.numPages },
				method: "pdfjs",
			};
		}
		throw new Error("No text content extracted");
	} catch (pdfjsError) {
		console.error("PDF.js failed:", pdfjsError);
	}

	try {
		const pdfParse = (await import("pdf-parse-debugging-disabled")).default;
		const data = await pdfParse(buffer);
		if (data.text?.trim()) {
			const pages = data.numpages || 1;
			const chunks = data.text.split(/\f/);
			const pageTexts: PdfPageText[] =
				chunks.length >= pages
					? chunks.slice(0, pages).map((text, index) => ({
							page: index + 1,
							text: text.trim(),
						}))
					: [{ page: 1, text: data.text.trim() }];
			return {
				text: combinePageTexts(pageTexts),
				pages,
				pageTexts,
				info: data.info,
				method: "pdf-parse-debugging-disabled",
			};
		}
		throw new Error("No text content extracted");
	} catch (pdfParseError) {
		console.error("pdf-parse-debugging-disabled failed:", pdfParseError);
	}

	return {
		text: `Unable to extract text from PDF "${fileName || "document"}". This may be due to:\n\n- The PDF being password protected\n- The PDF containing only images/scanned content\n- The PDF being corrupted or in an unsupported format\n- The PDF having complex layouts that are difficult to parse\n\nPlease ensure the PDF contains selectable text for AI analysis.`,
		pages: 0,
		pageTexts: [] as PdfPageText[],
		info: null,
		method: "all-methods-failed",
	};
}

export async function POST(req: NextRequest) {
	try {
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

export function GET() {
	return NextResponse.json({ message: "PDF extraction endpoint" });
}
