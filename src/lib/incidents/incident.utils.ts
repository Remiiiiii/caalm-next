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
