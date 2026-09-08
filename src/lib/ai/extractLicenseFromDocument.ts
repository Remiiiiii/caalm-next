import { GoogleGenerativeAI } from "@google/generative-ai";
import {
	EXTRACTABLE_LICENSE_FIELDS,
	LICENSE_EXTRACTION_METHOD,
	type LicenseExtractionMethod,
	mergeLicenseExtractions,
	type ParsedLicenseExtraction,
	parseLicenseExtractionJson,
	parseLicenseKeyValueText,
} from "./licenseExtractionSchema";

const apiKey = process.env.GOOGLE_API_KEY || "";

const extractionModel = new GoogleGenerativeAI(apiKey).getGenerativeModel({
	model: "gemini-3.5-flash-lite",
	generationConfig: {
		responseMimeType: "application/json",
		temperature: 0.1,
		maxOutputTokens: 4096,
	},
});

const GEMINI_RETRY_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_MS = 600;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
	if (error && typeof error === "object" && "status" in error) {
		const status = (error as { status?: unknown }).status;
		return typeof status === "number" ? status : undefined;
	}
	return undefined;
}

function isRetryableGeminiError(error: unknown): boolean {
	const status = getErrorStatus(error);
	if (status === 429 || status === 503 || status === 502 || status === 500) {
		return true;
	}
	const message = error instanceof Error ? error.message : String(error ?? "");
	return /503|429|unavailable|rate limit|overloaded/i.test(message);
}

async function generateJsonWithRetry(prompt: string): Promise<string> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= GEMINI_RETRY_ATTEMPTS; attempt++) {
		try {
			const result = await extractionModel.generateContent(prompt);
			return result.response.text() ?? "{}";
		} catch (error) {
			lastError = error;
			if (!isRetryableGeminiError(error) || attempt === GEMINI_RETRY_ATTEMPTS) {
				throw error;
			}
			await sleep(GEMINI_RETRY_BASE_MS * 2 ** (attempt - 1));
		}
	}
	throw lastError;
}

export type LicenseDocumentExtractionResult = ParsedLicenseExtraction & {
	method: LicenseExtractionMethod;
	filename: string;
	textLength: number;
	extractedData: Record<string, unknown>;
};

async function extractTextFromBuffer(
	buffer: Buffer,
	fileType: string,
	fileName: string,
): Promise<string> {
	const type = (fileType || "").toLowerCase();
	const ext = fileName.split(".").pop()?.toLowerCase() || "";

	if (type.includes("pdf") || ext === "pdf") {
		const pdfParse = (await import("pdf-parse-debugging-disabled")).default;
		const data = await pdfParse(buffer);
		return data.text || "";
	}

	if (
		type.includes("word") ||
		type.includes("officedocument.wordprocessing") ||
		ext === "docx" ||
		ext === "doc"
	) {
		const mammoth = (await import("mammoth")).default;
		const result = await mammoth.extractRawText({ buffer });
		return result.value || "";
	}

	if (type.includes("text") || ext === "txt" || ext === "md") {
		return buffer.toString("utf8");
	}

	try {
		const pdfParse = (await import("pdf-parse-debugging-disabled")).default;
		const data = await pdfParse(buffer);
		if (data.text?.trim()) return data.text;
	} catch {
		/* ignore */
	}

	return buffer.toString("utf8");
}

function buildExtractionPrompt(documentText: string): string {
	const fieldList = EXTRACTABLE_LICENSE_FIELDS.join(", ");

	return `You are an expert license IDP (intelligent document processing) system.
Extract structured fields from the license / certificate / permit document text below.
Handle both software/SaaS licenses and regulatory / facility / professional licenses.

Return ONE JSON object only (no markdown) with:
- Keys from this allow-list when present: ${fieldList}
- Also include "overallConfidence": number 0-1
- Also include "fieldConfidence": object mapping each filled field name to a number 0-1

Rules:
- Prefer explicit "fieldName:" labels in the document when present (e.g. cost: $650.00).
- Use null or omit keys you cannot find; do not invent amounts, dates, or authorities.
- Dates must be YYYY-MM-DD when possible.
- cost: numeric string without currency symbol (e.g. "650.00").
- currencyCode: ISO 4217 (e.g. USD).
- status: active | inactive | expired | pending-review | suspended | action-required.
- compliance: compliant | non-compliant | at-risk | action-required.
- category: saas | on_premise | cloud | certificate | insurance | other.
- division: administration | c-suite | management | childwelfare | behavioralhealth | clinic | residential | cins-fins-snap.
- licenseType: perpetual | subscription | concurrent | named_user | certificate | coi | purchase_order | facility_operating | professional | regulatory | operating_permit.
- Treat vendor/product values of "N/A" or "Not applicable" as omitted.
- issuingAuthority: the government agency or issuer (not the licensee organization).
- autoRenew: true/false only when clearly stated.
- Put narrative license scope into "description"; put inspection notes into "notes".

DOCUMENT TEXT:
${documentText.slice(0, 28000)}${documentText.length > 28000 ? "\n... (truncated)" : ""}`;
}

function toApiPayload(
	parsed: ParsedLicenseExtraction,
	meta: {
		method: LicenseExtractionMethod;
		filename: string;
		textLength: number;
	},
): LicenseDocumentExtractionResult {
	const extractedData: Record<string, unknown> = {
		...parsed.fields,
		overallConfidence: parsed.overallConfidence,
		fieldConfidence: parsed.fieldConfidence,
		filledFieldNames: parsed.filledFieldNames,
		lowConfidenceFields: parsed.lowConfidenceFields,
		method: meta.method,
		filename: meta.filename,
		textLength: meta.textLength,
	};

	return {
		...parsed,
		method: meta.method,
		filename: meta.filename,
		textLength: meta.textLength,
		extractedData,
	};
}

/**
 * Extract structured license fields from a document buffer via PDF/text parse +
 * optional key:value pre-parse + Gemini JSON.
 */
export async function extractLicenseFromDocument(options: {
	buffer: Buffer;
	fileName: string;
	fileType?: string;
}): Promise<LicenseDocumentExtractionResult> {
	const { buffer, fileName, fileType = "application/octet-stream" } = options;

	const text = await extractTextFromBuffer(buffer, fileType, fileName);
	const textLength = text.length;

	if (!text.trim()) {
		const empty = parseLicenseExtractionJson("{}");
		return toApiPayload(empty, {
			method: LICENSE_EXTRACTION_METHOD.gemini,
			filename: fileName,
			textLength: 0,
		});
	}

	const kvFields = parseLicenseKeyValueText(text);

	if (!apiKey) {
		// Deterministic path only when API key missing but PDF has labeled fields
		if (Object.keys(kvFields).length > 0) {
			const merged = mergeLicenseExtractions(
				kvFields,
				parseLicenseExtractionJson("{}"),
			);
			return toApiPayload(merged, {
				method: LICENSE_EXTRACTION_METHOD.gemini,
				filename: fileName,
				textLength,
			});
		}
		throw new Error("GOOGLE_API_KEY is not configured for license extraction");
	}

	const prompt = buildExtractionPrompt(text);

	try {
		const raw = await generateJsonWithRetry(prompt);
		const geminiParsed = parseLicenseExtractionJson(raw);
		const merged = mergeLicenseExtractions(kvFields, geminiParsed);
		return toApiPayload(merged, {
			method: LICENSE_EXTRACTION_METHOD.gemini,
			filename: fileName,
			textLength,
		});
	} catch (error) {
		if (Object.keys(kvFields).length > 0) {
			console.warn(
				"Gemini license extraction failed; using labeled-field fallback:",
				error instanceof Error ? error.message : error,
			);
			const merged = mergeLicenseExtractions(
				kvFields,
				parseLicenseExtractionJson("{}"),
			);
			return toApiPayload(merged, {
				method: LICENSE_EXTRACTION_METHOD.kvParse,
				filename: fileName,
				textLength,
			});
		}
		const status = getErrorStatus(error);
		if (status === 503 || status === 429) {
			throw new Error(
				"The AI extraction service is temporarily unavailable. Try again in a minute, or fill in the form manually.",
			);
		}
		throw error;
	}
}
