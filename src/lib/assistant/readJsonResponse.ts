/**
 * Parse a fetch Response as JSON without throwing on empty / non-JSON bodies.
 * Surfaces HTTP status when the body is missing.
 */
export async function readJsonResponse<T = unknown>(
	res: Response,
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
	const text = await res.text();
	if (!text.trim()) {
		return {
			ok: res.ok,
			status: res.status,
			data: null,
			error: res.ok
				? "Empty response from server"
				: `Request failed (${res.status}${res.statusText ? ` ${res.statusText}` : ""})`,
		};
	}
	try {
		const data = JSON.parse(text) as T;
		const errMsg =
			data &&
			typeof data === "object" &&
			"error" in data &&
			typeof (data as { error?: unknown }).error === "string"
				? (data as { error: string }).error
				: null;
		return {
			ok: res.ok,
			status: res.status,
			data,
			error: res.ok ? null : errMsg || `Request failed (${res.status})`,
		};
	} catch {
		return {
			ok: false,
			status: res.status,
			data: null,
			error: res.ok
				? "Invalid response from server"
				: `Request failed (${res.status})`,
		};
	}
}
