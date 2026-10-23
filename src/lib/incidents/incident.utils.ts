import { createHash, randomBytes } from "node:crypto";
import type { IncidentScale } from "./incident.types";

export function computeFingerprint(input: {
	route: string;
	elementKey: string;
	errorStatus?: number;
	errorCode?: string;
}): string {
	const raw = [
		input.route,
		input.elementKey,
		input.errorStatus ?? "",
		input.errorCode ?? "",
	].join("|");
	return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/** `INC-` + 6 uppercase hex chars, e.g. INC-7F3A92. */
export function generateIncidentReference(): string {
	return `INC-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export const SCALE_LABELS: Record<IncidentScale, string> = {
	page: "Page",
	section: "Section",
	table: "Table",
	banner: "Banner",
};

/** "page" reads as redundant next to the "Page" scale label, so spell it out. */
export function elementKeyLabel(elementKey: string): string {
	return elementKey === "page" ? "whole page" : elementKey;
}

const BROWSER_PATTERNS: Array<[RegExp, string]> = [
	[/Edg\/(\d+)/, "Edge"],
	[/OPR\/(\d+)/, "Opera"],
	[/Chrome\/(\d+)/, "Chrome"],
	[/Firefox\/(\d+)/, "Firefox"],
	[/Version\/(\d+).*Safari/, "Safari"],
];

/** Browser name + major version parsed from a UA string, e.g. "Chrome 130". */
export function browserFromUserAgent(
	ua: string | null | undefined,
): string | null {
	if (!ua) return null;
	for (const [pattern, name] of BROWSER_PATTERNS) {
		const match = ua.match(pattern);
		if (match) return `${name} ${match[1]}`;
	}
	return null;
}
