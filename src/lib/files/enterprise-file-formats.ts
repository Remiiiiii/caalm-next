/**
 * Enterprise document format policy for CAALM uploads.
 *
 * Tiers (industry rule of thumb):
 * - almostAlways: PDF, DOCX — negotiate/execute formats
 * - commonly: DOC, TXT, PNG, JPG — legacy docs and license scans
 * - sometimes: XLSX, CSV, PPTX — exhibits and supporting attachments only
 */

export type EnterpriseFileFormatTier = "almostAlways" | "commonly" | "sometimes";

/** Where the upload happens — each context allows a different extension set. */
export type EnterpriseUploadContext =
	| "contractPrimary"
	| "licensePrimary"
	| "attachment"
	| "generalDocument";

type FormatDefinition = {
	extension: string;
	mimeTypes: string[];
	tier: EnterpriseFileFormatTier;
	label: string;
};

const ENTERPRISE_FORMATS: FormatDefinition[] = [
	{
		extension: "pdf",
		mimeTypes: ["application/pdf"],
		tier: "almostAlways",
		label: "PDF",
	},
	{
		extension: "docx",
		mimeTypes: [
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		],
		tier: "almostAlways",
		label: "DOCX",
	},
	{
		extension: "doc",
		mimeTypes: ["application/msword"],
		tier: "commonly",
		label: "DOC",
	},
	{
		extension: "txt",
		mimeTypes: ["text/plain"],
		tier: "commonly",
		label: "TXT",
	},
	{
		extension: "png",
		mimeTypes: ["image/png"],
		tier: "commonly",
		label: "PNG",
	},
	{
		extension: "jpg",
		mimeTypes: ["image/jpeg"],
		tier: "commonly",
		label: "JPG",
	},
	{
		extension: "jpeg",
		mimeTypes: ["image/jpeg"],
		tier: "commonly",
		label: "JPEG",
	},
	{
		extension: "xlsx",
		mimeTypes: [
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		],
		tier: "sometimes",
		label: "XLSX",
	},
	{
		extension: "csv",
		mimeTypes: ["text/csv", "application/csv", "text/plain"],
		tier: "sometimes",
		label: "CSV",
	},
	{
		extension: "pptx",
		mimeTypes: [
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		],
		tier: "sometimes",
		label: "PPTX",
	},
	{
		extension: "ppt",
		mimeTypes: ["application/vnd.ms-powerpoint"],
		tier: "sometimes",
		label: "PPT",
	},
];

/** Explicit allowlists per upload surface (PPTX excluded from contract/license primary). */
const CONTEXT_EXTENSIONS: Record<EnterpriseUploadContext, readonly string[]> = {
	contractPrimary: ["pdf", "docx", "doc", "txt"],
	licensePrimary: ["pdf", "docx", "doc", "txt", "png", "jpg", "jpeg"],
	attachment: [
		"pdf",
		"docx",
		"doc",
		"txt",
		"png",
		"jpg",
		"jpeg",
		"xlsx",
		"csv",
		"pptx",
		"ppt",
	],
	generalDocument: [
		"pdf",
		"docx",
		"doc",
		"txt",
		"png",
		"jpg",
		"jpeg",
		"xlsx",
		"csv",
		"pptx",
		"ppt",
	],
};

const FORMAT_BY_EXTENSION = new Map(
	ENTERPRISE_FORMATS.map((format) => [format.extension, format]),
);

export function getEnterpriseFileExtension(fileName: string): string {
	const trimmed = fileName.trim();
	const dot = trimmed.lastIndexOf(".");
	if (dot <= 0 || dot === trimmed.length - 1) return "";
	return trimmed.slice(dot + 1).toLowerCase();
}

export function getAllowedExtensions(
	context: EnterpriseUploadContext,
): readonly string[] {
	return CONTEXT_EXTENSIONS[context];
}

export function getEnterpriseFormatLabels(
	context: EnterpriseUploadContext,
): string[] {
	const seen = new Set<string>();
	const labels: string[] = [];
	for (const ext of CONTEXT_EXTENSIONS[context]) {
		const label = FORMAT_BY_EXTENSION.get(ext)?.label ?? ext.toUpperCase();
		if (seen.has(label)) continue;
		seen.add(label);
		labels.push(label);
	}
	return labels;
}

export function getEnterpriseFormatHint(context: EnterpriseUploadContext): string {
	return `Supports ${getEnterpriseFormatLabels(context).join(", ")}`;
}

/** react-dropzone `accept` map for a given context. */
export function getEnterpriseDropzoneAccept(
	context: EnterpriseUploadContext,
): Record<string, string[]> {
	const allowed = new Set(CONTEXT_EXTENSIONS[context]);
	const accept: Record<string, string[]> = {};

	for (const format of ENTERPRISE_FORMATS) {
		if (!allowed.has(format.extension)) continue;
		for (const mime of format.mimeTypes) {
			if (!accept[mime]) accept[mime] = [];
			const dotted = `.${format.extension}`;
			if (!accept[mime].includes(dotted)) {
				accept[mime].push(dotted);
			}
		}
	}

	return accept;
}

/** HTML file input `accept` attribute (extension list). */
export function getEnterpriseInputAccept(
	context: EnterpriseUploadContext,
): string {
	return CONTEXT_EXTENSIONS[context].map((ext) => `.${ext}`).join(",");
}

export type EnterpriseFileValidationResult =
	| { ok: true; extension: string }
	| { ok: false; reason: string };

export function validateEnterpriseFile(
	file: Pick<File, "name" | "type">,
	context: EnterpriseUploadContext,
): EnterpriseFileValidationResult {
	const extension = getEnterpriseFileExtension(file.name);
	if (!extension) {
		return {
			ok: false,
			reason: `"${file.name}" has no file extension. Allowed: ${getEnterpriseFormatLabels(context).join(", ")}.`,
		};
	}

	const allowed = CONTEXT_EXTENSIONS[context];
	if (!allowed.includes(extension)) {
		return {
			ok: false,
			reason: `"${file.name}" is not an allowed file type. Allowed: ${getEnterpriseFormatLabels(context).join(", ")}.`,
		};
	}

	return { ok: true, extension };
}

export class EnterpriseFileFormatError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "EnterpriseFileFormatError";
	}
}

export function assertEnterpriseFileAllowed(
	file: Pick<File, "name" | "type">,
	context: EnterpriseUploadContext,
): void {
	const result = validateEnterpriseFile(file, context);
	if (!result.ok) {
		throw new EnterpriseFileFormatError(result.reason);
	}
}

export function resolveUploadContextFromMetadata(options: {
	contractMetadata?: unknown;
	licenseMetadata?: unknown;
}): EnterpriseUploadContext {
	if (options.contractMetadata) return "contractPrimary";
	if (options.licenseMetadata) return "licensePrimary";
	return "generalDocument";
}
