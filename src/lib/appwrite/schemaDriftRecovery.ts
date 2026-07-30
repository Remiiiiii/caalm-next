/**

 * Tolerates demo vs prod TablesDB schema drift on create/update.

 * Proactively clamps strings/enums before write, then retries on remaining errors.

 */



import type { TableWriteLimits } from "@/lib/appwrite/tableWriteLimits";

import { getWriteLimitsForTable } from "@/lib/appwrite/tableWriteLimits";



const UNKNOWN_ATTR_RE = /Unknown attribute: "([^"]+)"/;

const STRING_TOO_LONG_RE =

	/Attribute "([^"]+)" has invalid type\. Value must be a valid string and no longer than (\d+) chars/;

const INVALID_ENUM_RE =

	/Attribute "([^"]+)" has invalid format\. Value must be one of \(([^)]+)\)/;

const INVALID_TYPE_RE =

	/Attribute "([^"]+)" has invalid type(?!\. Value must be a valid string)/;



const ENUM_FALLBACKS: Record<string, string> = {

	contractType: "Other",

	compliance: "action-required",

	priority: "Medium",

	lifecycleStatus: "draft",

	status: "pending-review",

	department: "Administration",

	division: "management",

};



/** Limits learned from Appwrite errors during this process (field -> max chars). */

const learnedStringLimits = new Map<string, number>();



function parseAttributeKey(rawKey: string): string {

	return rawKey.replace(/\['(\d+)'\]$/, "").replace(/\[(\d+)\]$/, "");

}



function clampString(value: unknown, maxChars: number): unknown {

	if (typeof value !== "string") return value;

	const trimmed = value.trim();

	if (!trimmed) return trimmed;

	return trimmed.length > maxChars ? trimmed.slice(0, maxChars) : trimmed;

}



function clampStringArray(value: unknown, maxChars: number): unknown {

	if (!Array.isArray(value)) return value;

	return value

		.map((item) => clampString(item, maxChars))

		.filter((item) => typeof item === "string" && item.length > 0);

}



function pickEnumFallback(key: string, allowedRaw: string): unknown {

	const allowed = allowedRaw

		.split(",")

		.map((part) => part.trim())

		.filter(Boolean);

	if (allowed.length === 0) return undefined;



	const preferred = ENUM_FALLBACKS[key];

	if (preferred && allowed.includes(preferred)) return preferred;



	if (key === "compliance") {

		if (allowed.includes("up-to-date")) return "up-to-date";

		if (allowed.includes("compliant")) return "compliant";

		if (allowed.includes("action-required")) return "action-required";

	}



	return allowed[0];

}



function resolveFieldLimit(

	key: string,

	limits: TableWriteLimits | undefined,

	isArray: boolean,

): number | undefined {

	const learned = learnedStringLimits.get(key);

	if (learned !== undefined) return learned;

	if (!limits) return isArray ? undefined : undefined;

	if (limits.fields[key] !== undefined) return limits.fields[key];

	return isArray ? limits.defaultArrayElement : limits.defaultScalar;

}



function normalizeEnumValue(

	key: string,

	value: unknown,

	limits: TableWriteLimits | undefined,

): unknown {

	if (typeof value !== "string" || !limits?.enumFields?.[key]) return value;

	const allowed = limits.enumFields[key];

	if (allowed.includes(value)) return value;



	if (key === "compliance") {

		if (value === "compliant" && allowed.includes("up-to-date")) {

			return "up-to-date";

		}

		if (value === "at-risk" && allowed.includes("action-required")) {

			return "action-required";

		}

	}



	return pickEnumFallback(key, allowed.join(", "));

}



/**

 * Clamp strings, array elements, and known enums before hitting Appwrite.

 */

export function sanitizeRowForWrite(

	data: Record<string, unknown>,

	limits?: TableWriteLimits,

): Record<string, unknown> {

	const out: Record<string, unknown> = { ...data };



	for (const [key, value] of Object.entries(out)) {

		if (value === undefined || value === null) continue;



		if (limits?.enumFields?.[key] && typeof value === "string") {

			out[key] = normalizeEnumValue(key, value, limits);

			continue;

		}



		if (Array.isArray(value)) {

			const max = resolveFieldLimit(key, limits, true);

			if (max !== undefined) {

				out[key] = clampStringArray(value, max);

			}

			continue;

		}



		if (typeof value === "string") {

			const max = resolveFieldLimit(key, limits, false);

			if (max !== undefined) {

				out[key] = clampString(value, max);

			}

		}

	}



	return out;

}



function applySchemaDriftFix(

	data: Record<string, unknown>,

	message: string,

): boolean {

	const unknown = message.match(UNKNOWN_ATTR_RE);

	if (unknown?.[1]) {

		const key = parseAttributeKey(unknown[1]);

		if (key in data) {

			delete data[key];

			return true;

		}

	}



	const tooLong = message.match(STRING_TOO_LONG_RE);

	if (tooLong?.[1] && tooLong[2]) {

		const rawKey = tooLong[1];

		const key = parseAttributeKey(rawKey);

		const max = Number.parseInt(tooLong[2], 10);

		if (!Number.isFinite(max)) return false;



		learnedStringLimits.set(key, max);



		if (!(key in data)) return false;

		const current = data[key];

		data[key] = Array.isArray(current)

			? clampStringArray(current, max)

			: clampString(current, max);

		return true;

	}



	const invalidEnum = message.match(INVALID_ENUM_RE);

	if (invalidEnum?.[1]) {

		const key = parseAttributeKey(invalidEnum[1]);

		if (!(key in data)) return false;

		const fallback = pickEnumFallback(key, invalidEnum[2] || "");

		if (fallback === undefined) {

			delete data[key];

		} else {

			data[key] = fallback;

		}

		return true;

	}



	const invalidType = message.match(INVALID_TYPE_RE);

	if (invalidType?.[1]) {

		const key = parseAttributeKey(invalidType[1]);

		if (!(key in data)) return false;

		delete data[key];

		return true;

	}



	return false;

}



function normalizeAppwriteErrorMessage(message: string): string {

	const prefix = "Invalid document structure: ";

	return message.startsWith(prefix) ? message.slice(prefix.length) : message;

}



function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (
		typeof error === "object" &&
		error &&
		"message" in error &&
		typeof (error as { message?: unknown }).message === "string"
	) {
		return (error as { message: string }).message;
	}
	return String(error ?? "");
}

/** Errors that schema drift retries cannot fix (missing table, auth, etc.). */
export function isNonRecoverableAppwriteError(error: unknown): boolean {
	if (typeof error === "object" && error && "type" in error) {
		const type = String((error as { type?: unknown }).type ?? "");
		if (
			type === "table_not_found" ||
			type === "collection_not_found" ||
			type === "row_not_found" ||
			type === "document_not_found"
		) {
			return true;
		}
	}
	const message = getErrorMessage(error).toLowerCase();
	return (
		message.includes("could not be found") ||
		message.includes("table with the requested id") ||
		message.includes("collection with the requested id")
	);
}



type TablesDbWriter = {

	createRow: (args: {

		databaseId: string;

		tableId: string;

		rowId: string;

		data: Record<string, unknown>;

	}) => Promise<unknown>;

	updateRow: (args: {

		databaseId: string;

		tableId: string;

		rowId: string;

		data: Record<string, unknown>;

	}) => Promise<unknown>;

};



export async function writeRowWithSchemaDriftRecovery(params: {

	tablesDB: TablesDbWriter;

	mode: "create" | "update";

	databaseId: string;

	tableId: string;

	rowId: string;

	data: Record<string, unknown>;

	maxAttempts?: number;

	writeLimits?: TableWriteLimits;

}): Promise<any> {

	const limits =

		params.writeLimits ?? getWriteLimitsForTable(params.tableId);

	let data = sanitizeRowForWrite({ ...params.data }, limits);

	const maxAttempts = params.maxAttempts ?? 16;



	for (let attempt = 0; attempt < maxAttempts; attempt++) {

		try {

			if (params.mode === "create") {

				return await params.tablesDB.createRow({

					databaseId: params.databaseId,

					tableId: params.tableId,

					rowId: params.rowId,

					data,

				});

			}

			return await params.tablesDB.updateRow({

				databaseId: params.databaseId,

				tableId: params.tableId,

				rowId: params.rowId,

				data,

			});

		} catch (error: unknown) {

			if (isNonRecoverableAppwriteError(error)) {

				throw error;

			}

			const message = normalizeAppwriteErrorMessage(getErrorMessage(error));

			if (!applySchemaDriftFix(data, message)) {

				throw error;

			}

			data = sanitizeRowForWrite(data, limits);

			console.warn(

				`Schema drift recovery (${params.mode} ${params.tableId}, attempt ${attempt + 1}): ${message}`,

			);

		}

	}



	throw new Error(

		`Too many schema drift recovery attempts for ${params.tableId} ${params.mode}`,

	);

}


