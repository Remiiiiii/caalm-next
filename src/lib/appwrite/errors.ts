/**
 * Classify Appwrite / fetch failures so callers can degrade instead of
 * treating a timeout like "this row does not exist".
 */

/** Cap Appwrite lookups so a hung IPv6/CDN connect cannot freeze the UI for 30s+. */
export const APPWRITE_LOOKUP_TIMEOUT_MS = 8000;

export async function withAppwriteLookupTimeout<T>(
	promise: Promise<T>,
	timeoutMs = APPWRITE_LOOKUP_TIMEOUT_MS,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<T>((_, reject) => {
				timer = setTimeout(() => {
					const error = new Error(
						`Operation timed out after ${timeoutMs}ms`,
					);
					error.name = "TimeoutError";
					reject(error);
				}, timeoutMs);
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

export function isAppwriteNotFoundError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const err = error as { code?: number | string; type?: string };
	const code = Number(err.code);
	const type = String(err.type ?? "");
	return (
		code === 404 ||
		type === "document_not_found" ||
		type === "row_not_found"
	);
}

function errorChainText(error: unknown): string {
	const parts: string[] = [];
	let current: unknown = error;
	for (let depth = 0; current && depth < 4; depth += 1) {
		if (current instanceof Error) {
			parts.push(current.name, current.message);
			current = current.cause;
			continue;
		}
		if (typeof current === "object") {
			const obj = current as {
				message?: string;
				code?: string | number;
				cause?: unknown;
			};
			if (obj.message) parts.push(String(obj.message));
			if (obj.code !== undefined) parts.push(String(obj.code));
			current = obj.cause;
			continue;
		}
		break;
	}
	return parts.join(" ");
}

export function isTransientAppwriteError(error: unknown): boolean {
	if (typeof error === "string") {
		const text = error.toLowerCase();
		return text.includes("fetch failed") || text.includes("timeout");
	}
	if (!error || typeof error !== "object") return false;

	const err = error as {
		name?: string;
		code?: string | number;
		cause?: { code?: string; message?: string };
	};

	if (err.name === "AbortError" || err.name === "TimeoutError") return true;

	const code = String(err.code ?? err.cause?.code ?? "");
	if (
		code === "UND_ERR_CONNECT_TIMEOUT" ||
		code === "ENOTFOUND" ||
		code === "ETIMEDOUT" ||
		code === "ECONNRESET" ||
		code === "ECONNREFUSED"
	) {
		return true;
	}

	const text = errorChainText(error).toLowerCase();
	return (
		text.includes("fetch failed") ||
		text.includes("timed out") ||
		text.includes("timeout") ||
		text.includes("appwriteexception") ||
		text.includes("project with the requested id could not be found")
	);
}
