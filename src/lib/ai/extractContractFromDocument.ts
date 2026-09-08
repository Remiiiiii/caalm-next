import { GoogleGenerativeAI } from "@google/generative-ai";
import {
	CONTRACT_EXTRACTION_METHOD,
	type ContractExtractionMethod,
	EXTRACTABLE_CONTRACT_FIELDS,
	type ParsedContractExtraction,
	parseContractExtractionJson,
} from "./contractExtractionSchema";

const apiKey = process.env.GOOGLE_API_KEY || "";

const extractionModel = new GoogleGenerativeAI(apiKey).getGenerativeModel({
	model: "gemini-3.5-flash-lite",
	generationConfig: {
		responseMimeType: "application/json",
		temperature: 0.1,
		maxOutputTokens: 4096,
	},
});

export type ContractDocumentExtractionResult = ParsedContractExtraction & {
	method: ContractExtractionMethod;
	filename: string;
	textLength: number;
	/** Flat fields for API consumers (legacy + new). */
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

	// Last resort: try pdf-parse (many uploads mislabel MIME)
	try {
		const pdfParse = (await import("pdf-parse-debugging-disabled")).default;
		const data = await pdfParse(buffer);
		if (data.text?.trim()) return data.text;
	} catch {
		/* ignore */
	}

	return buffer.toString("utf8");
}

function buildExtractionPrompt(
	documentText: string,
	contractTypeId?: string | null,
	contractTypeLabel?: string | null,
): string {
	const typeHint =
		contractTypeId || contractTypeLabel
			? `Selected contract type: ${contractTypeLabel || contractTypeId} (id: ${contractTypeId || "n/a"}). Prefer fields relevant to this type (e.g. government/grant: agency, NTE amount, HIPAA, budget codes).`
			: "Contract type was not specified; extract all identifiable fields.";

	const fieldList = EXTRACTABLE_CONTRACT_FIELDS.join(", ");

	return `You are an expert contract IDP (intelligent document processing) system.
Extract structured fields from the contract document text below.

${typeHint}

Return ONE JSON object only (no markdown) with:
- Keys from this allow-list when present: ${fieldList}
- Also include "overallConfidence": number 0-1
- Also include "fieldConfidence": object mapping each filled field name to a number 0-1

Rules:
- Use null or omit keys you cannot find; do not invent parties, amounts, or dates.
- Dates must be YYYY-MM-DD when possible.
- amount / notToExceedAmount: numeric string without currency symbol preferred (e.g. "487500.00").
- paymentTerms: prefer values like "Net 30", "Net 60".
- paymentSchedule: prefer Monthly, Quarterly, Annually, One-time, Milestone-based.
- lifecycleStatus: Draft, Under Review, Approved, Active, Expired, Terminated, On Hold.
- riskLevel: Critical, High, Medium, Low.
- counterpartyType: Individual, Corporation, LLC, Government Entity, Nonprofit, Partnership, Other.
- counterpartyLegalName: the vendor/grantee/counterparty legal name (never put the funding agency here unless they are the counterparty).
- assignToDepartment: best-fit among IT, Finance, Administration, Legal, Operations, Sales, Marketing, Executive, Engineering.
- Booleans (hipaaRequired, auditRightsGranted, backgroundCheckRequired, insuranceRequired, autoRenew, indemnificationIncluded): true/false only when clearly stated.
- Put long narrative clauses into the matching text fields (keyObligations, regulatoryRequirements, etc.).

DOCUMENT TEXT:
${documentText.slice(0, 28000)}${documentText.length > 28000 ? "\n... (truncated)" : ""}`;
}

function toApiPayload(
	parsed: ParsedContractExtraction,
	meta: {
		method: ContractExtractionMethod;
		filename: string;
		textLength: number;
	},
): ContractDocumentExtractionResult {
	const extractedData: Record<string, unknown> = {
		...parsed.fields,
		// Legacy alias for older clients
		vendor: parsed.fields.counterpartyLegalName,
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
 * Extract structured contract fields from a document buffer via PDF/text parse + Gemini JSON.
 */
export async function extractContractFromDocument(options: {
	buffer: Buffer;
	fileName: string;
	fileType?: string;
	contractTypeId?: string | null;
	contractTypeLabel?: string | null;
}): Promise<ContractDocumentExtractionResult> {
	const {
		buffer,
		fileName,
		fileType = "application/octet-stream",
		contractTypeId,
		contractTypeLabel,
	} = options;

	const text = await extractTextFromBuffer(buffer, fileType, fileName);
	const textLength = text.length;

	if (!text.trim()) {
		const empty = parseContractExtractionJson("{}");
		return toApiPayload(empty, {
			method: CONTRACT_EXTRACTION_METHOD.gemini,
			filename: fileName,
			textLength: 0,
		});
	}

	if (!apiKey) {
		throw new Error("GOOGLE_API_KEY is not configured for contract extraction");
	}

	const prompt = buildExtractionPrompt(text, contractTypeId, contractTypeLabel);
	const result = await extractionModel.generateContent(prompt);
	const raw = result.response.text() ?? "{}";
	const parsed = parseContractExtractionJson(raw);

	return toApiPayload(parsed, {
		method: CONTRACT_EXTRACTION_METHOD.gemini,
		filename: fileName,
		textLength,
	});
}
