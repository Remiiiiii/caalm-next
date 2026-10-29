const MAX_URL_LEN = 2048;

export type ProblemPageUrlResult =
	| { ok: true; href: string; path: string }
	| { ok: false; reason: string };

/** Same-origin app path or full URL on this host. */
export function parseProblemPageUrl(
	raw: string,
	origin = typeof window !== "undefined" ? window.location.origin : "",
): ProblemPageUrlResult {
	const trimmed = raw.trim();
	if (!trimmed) {
		return {
			ok: false,
			reason: "Add the page address where the problem happens.",
		};
	}
	if (trimmed.length > MAX_URL_LEN) {
		return { ok: false, reason: "That address is too long." };
	}

	try {
		let path: string;
		let href: string;

		if (trimmed.startsWith("/")) {
			path = normalizePath(trimmed);
			href = origin ? `${origin}${path}` : path;
		} else {
			const url = new URL(trimmed);
			if (origin && url.origin !== origin) {
				return {
					ok: false,
					reason: "Use a link from this CAALM site (same website address).",
				};
			}
			path = normalizePath(url.pathname + url.search + url.hash);
			href = origin ? `${origin}${path}` : url.toString();
		}

		if (path === "/sign-in" || path.startsWith("/sign-in/")) {
			return {
				ok: false,
				reason: "Pick a page inside the app after you sign in.",
			};
		}

		return { ok: true, href, path };
	} catch {
		return {
			ok: false,
			reason:
				"That does not look like a valid link. Try Copy link from your browser.",
		};
	}
}

function normalizePath(path: string): string {
	if (!path.startsWith("/")) return `/${path}`;
	return path;
}

export function defaultProblemPageUrl(
	pathname: string,
	origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
	const path = normalizePath(pathname || "/dashboard");
	return origin ? `${origin}${path}` : path;
}

/** Server-side: normalize and validate before saving on a ticket row. */
export function assertProblemPageUrl(raw: unknown, origin: string): string {
	const parsed = parseProblemPageUrl(String(raw ?? ""), origin);
	if (!parsed.ok) throw new Error(parsed.reason);
	return parsed.href;
}

export const PROBLEM_PAGE_URL_HELP = [
	"Open the page where the problem shows up.",
	"Click the address bar at the top of your browser.",
	"Press Ctrl+C (Windows) or ⌘+C (Mac) to copy.",
	"Paste it in the box below (Ctrl+V or ⌘+V).",
] as const;
