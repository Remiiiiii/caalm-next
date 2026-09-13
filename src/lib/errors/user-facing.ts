/**
 * Turn thrown/API errors into short messages safe to show in the UI.
 * Keeps intentional product copy; replaces stacks, bundler noise, and internals.
 */

const DEFAULT_FALLBACK = "Something went wrong. Please try again.";

/** Patterns that mean “this is for developers, not end users.” */
const TECHNICAL_PATTERNS: RegExp[] = [
	/TURBOPACK/i,
	/__TURBOPACK__/i,
	/webpack/i,
	/node_modules/i,
	/is not a function/i,
	/cannot read propert/i,
	/cannot set propert/i,
	/undefined is not/i,
	/null is not/i,
	/\bTypeError\b/i,
	/\bReferenceError\b/i,
	/\bSyntaxError\b/i,
	/\bEvalError\b/i,
	/\bURIError\b/i,
	/\bat\s+\S+\s+\(/,
	/\.tsx?\b/,
	/\.jsx?\b/,
	/\[app-route\]/i,
	/\[ecmascript\]/i,
	/imported__module/i,
	/\bECONNREFUSED\b/i,
	/\bENOTFOUND\b/i,
	/\bETIMEDOUT\b/i,
	/\bMongoError\b/i,
	/\bAppwriteException\b/i,
	/\bInternal Server Error\b/i,
	/\bprisma\b/i,
	/stack trace/i,
	/^\s*Error:\s*$/i,
];

function extractRawMessage(error: unknown): string {
	if (error == null) return "";
	if (typeof error === "string") return error.trim();
	if (error instanceof Error) return (error.message || "").trim();
	if (typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string") return message.trim();
	}
	return "";
}

export function isTechnicalErrorMessage(message: string): boolean {
	const text = message.trim();
	if (!text) return true;
	if (text.length > 220) return true;
	if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(text))) return true;
	// Bundler/module path noise: long encoded segments without spaces
	if (/__[a-z0-9$]{12,}/i.test(text)) return true;
	if (/\$5b\$|\$5d\$|\$2f\$/.test(text)) return true;
	return false;
}

/**
 * @param error - thrown value, Error, or API `error` string
 * @param fallback - shown when the raw message is missing or technical
 */
export function toUserFacingErrorMessage(
	error: unknown,
	fallback: string = DEFAULT_FALLBACK,
): string {
	const raw = extractRawMessage(error);
	if (!raw || isTechnicalErrorMessage(raw)) {
		return fallback;
	}
	return raw;
}
