export type PdfPageText = { page: number; text: string };

export function combinePageTexts(pageTexts: PdfPageText[]): string {
	return pageTexts
		.map((entry) => `[[PAGE:${entry.page}]]\n${entry.text}`)
		.join("\n\n")
		.trim();
}

export async function parsePdfBuffer(buffer: Buffer, fileName?: string) {
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
