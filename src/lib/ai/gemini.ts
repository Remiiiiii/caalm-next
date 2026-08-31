import { GoogleGenerativeAI } from "@google/generative-ai";
import {
	buildContractTypeFallbackResult,
	type ContractTypeSuggestionResult,
	parseContractTypeSuggestionJson,
} from "./contractTypeSuggestionSchema";

export type { ContractTypeSuggestionResult };

// Initialize Gemini AI - Use server-side environment variable
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
	console.error("GOOGLE_API_KEY environment variable is not set");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

// Initialize the model - Use the correct model name
export const model = genAI.getGenerativeModel({
	model: "gemini-3.5-flash-lite",
});

/** JSON-only responses for contract type quiz (do not reuse plain `model` here). */
const contractTypeSuggestionModel = genAI.getGenerativeModel({
	model: "gemini-3.5-flash-lite",
	generationConfig: {
		responseMimeType: "application/json",
		temperature: 0.2,
		maxOutputTokens: 512,
	},
});

export interface DocumentAnalysis {
	summary: string;
	keyPoints: string[];
	suggestedQuestions: string[];
	documentType: string;
	topics: string[];
}

export interface AIResponse {
	answer: string;
	confidence: number;
	sources?: string[];
}

export interface ContractTypeSuggestionInput {
	questionId: string;
	answer: string;
}

/**
 * Suggest contract type(s) from quiz answers using structured JSON + allow-list validation.
 * Never falls back to the first config entry (employment).
 */
export async function suggestContractType(
	answers: ContractTypeSuggestionInput[],
	freeText?: string | null,
): Promise<ContractTypeSuggestionResult> {
	const { CONTRACT_TYPE_CONFIGS } = await import(
		"@/lib/contracts/contractTypeConfigs"
	);
	const validIds = CONTRACT_TYPE_CONFIGS.map((c) => c.id);

	if (!apiKey) {
		return buildContractTypeFallbackResult(
			"AI is not configured. Choose a contract type from the list or browse all types.",
		);
	}

	const typeList = CONTRACT_TYPE_CONFIGS.map(
		(c) => `- ${c.id}: ${c.label} — ${c.description}`,
	).join("\n");

	const answersText = answers
		.map((a) => `${a.questionId}: ${a.answer}`)
		.join("\n");

	const note = freeText?.trim().length
		? `\nOptional user description:\n${freeText.trim()}`
		: "";

	const idList = validIds.join(", ");

	const prompt = `You are a contract classification assistant for a nonprofit / enterprise contract system.
Based on the user's quiz answers, pick the best matching contract type id from the list below.

Return ONE JSON object only (no markdown) with exactly these keys:
- "primaryTypeId": string, must be exactly one of: ${idList}
- "confidence": number from 0 through 1 (your confidence in primaryTypeId)
- "alternates": array with at most 2 objects, each like {"typeId": string, "confidence"?: number}. Each typeId must be from the same allowed list. Do not repeat primaryTypeId. Use alternates when the user could reasonably fit another type.
- "rationale": string, 1-2 short sentences for a non-lawyer user.

ALLOWED TYPE IDS ONLY: ${idList}

TYPE REFERENCE:
${typeList}

QUIZ ANSWERS:
${answersText}${note}`;

	try {
		const result = await contractTypeSuggestionModel.generateContent(prompt);
		const text = result.response.text() ?? "{}";
		return parseContractTypeSuggestionJson(
			text,
			validIds,
			CONTRACT_TYPE_CONFIGS,
		);
	} catch (error) {
		console.error("suggestContractType error:", error);
		return buildContractTypeFallbackResult(
			"We couldn't reach the AI service. Pick a type below or browse all contract types.",
		);
	}
}

// Suggested questions based on document type
const getSuggestedQuestions = (documentType: string): string[] => {
	const baseQuestions = [
		"What is the main purpose of this document?",
		"What are the key points or findings?",
		"Who are the main parties or stakeholders mentioned?",
		"What is the expiration date of this contract?",
		"What actions are required or recommended?",
	];

	const typeSpecificQuestions: { [key: string]: string[] } = {
		pdf: [
			"Can you summarize the main sections of this document?",
			"What are the most important details I should know?",
			"Are there any legal implications or requirements mentioned?",
			"What are the next steps or recommendations?",
		],
		doc: [
			"What is the document structure and organization?",
			"What are the key takeaways from this document?",
			"Are there any important figures or data mentioned?",
			"What are the main conclusions or recommendations?",
		],
		docx: [
			"What is the document structure and organization?",
			"What are the key takeaways from this document?",
			"Are there any important figures or data mentioned?",
			"What are the main conclusions or recommendations?",
		],
		txt: [
			"What is the main content of this text file?",
			"Are there any important patterns or information?",
			"What should I focus on in this document?",
			"Are there any key terms or concepts I should understand?",
		],
		jpg: [
			"What can you see in this image?",
			"Are there any important details or text visible?",
			"What is the context or purpose of this image?",
			"Are there any people, objects, or locations shown?",
		],
		jpeg: [
			"What can you see in this image?",
			"Are there any important details or text visible?",
			"What is the context or purpose of this image?",
			"Are there any people, objects, or locations shown?",
		],
		png: [
			"What can you see in this image?",
			"Are there any important details or text visible?",
			"What is the context or purpose of this image?",
			"Are there any people, objects, or locations shown?",
		],
	};

	const specificQuestions =
		typeSpecificQuestions[documentType.toLowerCase()] || [];
	return [...baseQuestions, ...specificQuestions].slice(0, 8); // Limit to 8 questions
};

// Analyze document content and extract key information
export const analyzeDocument = async (
	fileName: string,
	fileType: string,
	fileContent?: string,
	fileUrl?: string,
): Promise<DocumentAnalysis> => {
	try {
		console.log("Starting document analysis:", {
			fileName,
			fileType,
			hasContent: !!fileContent,
			contentLength: fileContent?.length || 0,
			hasUrl: !!fileUrl,
		});

		const prompt = `
Analyze this document and write a scannable summary in GitHub-flavored markdown.
Match this layout exactly (no SUMMARY:/KEY POINTS: labels):

1) One short intro paragraph. Bold the document type (e.g. **Government Contract**).
2) A ## Key Information heading, then bullets as **Label:** value for any facts you can find (parties, agency, contractor, effective date, expiry, amount, governing law, document length/pages). Omit unknown labels.
3) For each major numbered section in the document (Statement of Work, Consideration, etc.), add a ## Section Title heading, one short paragraph, then bullets with **Lead-in:** detail when helpful.

Rules:
- Use only information present in the document text. Do not invent dates, parties, or amounts.
- Prefer bullets over long paragraphs.
- Do not wrap the whole reply in a code fence.

Document Name: ${fileName}
Document Type: ${fileType}
${fileContent ? `Content:\n${fileContent.slice(0, 120000)}` : "No content available"}
${fileUrl ? `URL: ${fileUrl}` : ""}
`;

		console.log("Sending prompt to Gemini AI...");
		const result = await model.generateContent(prompt);
		const response = await result.response;
		const text = response.text().trim();
		console.log("Received AI response, length:", text.length);

		const lines = text
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		// Prefer the full markdown body as the display summary.
		let summary = text;
		const keyPoints: string[] = [];
		const topics: string[] = [];
		let documentType = fileType;

		for (const line of lines) {
			const bullet = line.match(/^[-*•]\s+\*\*([^*]+):\*\*\s*(.+)$/);
			if (bullet) {
				keyPoints.push(`${bullet[1].trim()}: ${bullet[2].trim()}`);
			}
			const heading = line.match(/^##\s+(.+)$/);
			if (heading) {
				topics.push(heading[1].trim());
			}
		}

		// Infer type from intro bold phrase when present.
		const boldType = text.match(/\*\*([^*]+Contract[^*]*)\*\*/i);
		if (boldType?.[1]) {
			documentType = boldType[1].trim();
		}

		if (!summary) {
			summary = "Document analysis completed";
		}
		if (keyPoints.length === 0) {
			for (const line of lines) {
				if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
					keyPoints.push(line.replace(/^[-*•]\s+/, "").replace(/\*\*/g, ""));
				}
				if (keyPoints.length >= 8) break;
			}
		}

		const suggestedQuestions = getSuggestedQuestions(documentType);

		console.log("Analysis completed successfully:", {
			summaryLength: summary.length,
			keyPointsCount: keyPoints.length,
			topicsCount: topics.length,
			suggestedQuestionsCount: suggestedQuestions.length,
		});

		return {
			summary,
			keyPoints,
			suggestedQuestions,
			documentType,
			topics,
		};
	} catch (error) {
		console.error("Error analyzing document:", error);
		console.error("Error details:", {
			fileName,
			fileType,
			hasContent: !!fileContent,
			contentLength: fileContent?.length || 0,
			hasUrl: !!fileUrl,
			apiKeyExists: !!process.env.GOOGLE_API_KEY,
			apiKeyLength: process.env.GOOGLE_API_KEY?.length || 0,
			modelName: "gemini-3.5-flash-lite",
		});
		return {
			summary: "Unable to analyze document at this time",
			keyPoints: [],
			suggestedQuestions: getSuggestedQuestions(fileType),
			documentType: fileType,
			topics: [],
		};
	}
};

// Answer specific questions about the document
export const answerQuestion = async (
	question: string,
	fileName: string,
	fileType: string,
	fileContent?: string,
	fileUrl?: string,
	previousContext?: string,
): Promise<AIResponse> => {
	try {
		const contextPrompt = previousContext
			? `Previous conversation context: ${previousContext}\n\n`
			: "";

		const prompt = `
      ${contextPrompt}
      You are an AI assistant analyzing a document. Please answer the following question about the document:
      
      Document Name: ${fileName}
      Document Type: ${fileType}
      ${fileContent ? `Content: ${fileContent}` : ""}
      ${fileUrl ? `URL: ${fileUrl}` : ""}
      
      Question: ${question}
      
      Please provide a clear, accurate answer based on the document content. If the information is not available in the document, clearly state that. If you're making assumptions, clearly indicate them. Provide specific references or quotes from the document when possible.
      
      Answer in plain text format - no JSON, no special formatting, just a natural, human-readable response.
    `;

		const result = await model.generateContent(prompt);
		const response = await result.response;
		const text = response.text();

		// The response is now plain text, so we can use it directly
		return {
			answer: text || "I'm unable to provide a specific answer at this time.",
			confidence: 0.8, // Default confidence for plain text responses
			sources: [], // We'll extract sources from the text if needed in the future
		};
	} catch (error) {
		console.error("Error answering question:", error);
		return {
			answer:
				"I'm sorry, I encountered an error while processing your question. Please try again.",
			confidence: 0.0,
			sources: [],
		};
	}
};

// Get document content for analysis (placeholder for file content extraction)
export const extractDocumentContent = async (
	fileUrl: string,
	fileType: string,
): Promise<string> => {
	try {
		console.log("Starting content extraction:", { fileUrl, fileType });
		const fileTypeLower = fileType.toLowerCase();

		// For text files, fetch and return content directly
		if (
			[
				"txt",
				"md",
				"json",
				"xml",
				"html",
				"css",
				"js",
				"ts",
				"jsx",
				"tsx",
			].includes(fileTypeLower)
		) {
			console.log("Extracting text file content...");
			const response = await fetch(fileUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch text file: ${response.statusText}`);
			}
			const content = await response.text();
			console.log("Text file content extracted, length:", content.length);
			return content;
		}

		// For PDFs, extract text using pdf-parse
		if (fileTypeLower === "pdf") {
			console.log("Extracting PDF content...");
			const response = await fetch(fileUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch PDF: ${response.statusText}`);
			}
			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Use dynamic import to avoid module loading issues
			const pdfParse = (await import("pdf-parse-debugging-disabled")).default;
			const data = await pdfParse(buffer);
			const text = data.text || "No text content found in PDF";
			console.log("PDF content extracted, length:", text.length);
			return text;
		}

		// For images, use OCR to extract text
		if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileTypeLower)) {
			console.log("Extracting image content using OCR...");
			const response = await fetch(fileUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.statusText}`);
			}
			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Use dynamic import to avoid module loading issues
			const Tesseract = (await import("tesseract.js")).default;
			const {
				data: { text },
			} = await Tesseract.recognize(buffer, "eng");

			const extractedText = text || "No text found in image";
			console.log("Image OCR completed, length:", extractedText.length);
			return extractedText;
		}

		// For Microsoft Office documents
		if (["docx", "doc"].includes(fileTypeLower)) {
			console.log("Extracting Word document content...");
			const response = await fetch(fileUrl);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch Word document: ${response.statusText}`,
				);
			}
			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Use dynamic import to avoid module loading issues
			const mammoth = (await import("mammoth")).default;
			const result = await mammoth.extractRawText({ buffer });
			const text = result.value || "No text content found in Word document";
			console.log("Word document content extracted, length:", text.length);
			return text;
		}

		if (["xlsx", "xls"].includes(fileTypeLower)) {
			console.log("Extracting Excel document content...");
			const response = await fetch(fileUrl);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch Excel document: ${response.statusText}`,
				);
			}
			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Use dynamic import to avoid module loading issues
			const XLSX = await import("xlsx");
			const workbook = XLSX.read(buffer, { type: "buffer" });
			let text = "";

			// Extract text from all sheets
			workbook.SheetNames.forEach((sheetName: string) => {
				const sheet = workbook.Sheets[sheetName];
				const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
				const sheetText = sheetData
					.map((row: unknown) =>
						Array.isArray(row) ? row.join("\t") : JSON.stringify(row),
					)
					.join("\n");
				text += `Sheet: ${sheetName}\n${sheetText}\n\n`;
			});

			const extractedText = text || "No text content found in Excel document";
			console.log(
				"Excel document content extracted, length:",
				extractedText.length,
			);
			return extractedText;
		}

		if (["pptx", "ppt"].includes(fileTypeLower)) {
			console.log("PowerPoint document detected, returning placeholder");
			return `PowerPoint document (${fileTypeLower}). PowerPoint text extraction requires additional libraries like pptxjs or similar.`;
		}

		// For other file types, return a generic message
		console.log("Unsupported file type:", fileTypeLower);
		return `File type ${fileTypeLower} is not yet supported for text extraction. The AI will work with the file metadata and any available description.`;
	} catch (error) {
		console.error("Error extracting document content:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("Content extraction failed for:", {
			fileUrl,
			fileType,
			errorMessage,
		});
		return `Error extracting content from ${fileType} file: ${errorMessage}`;
	}
};
