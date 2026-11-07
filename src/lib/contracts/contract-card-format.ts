/**
 * Display helpers for the contracts grid card comparison strip.
 * Days and tiers are computed per render against "today", not fetch time.
 */

export const CONTRACT_CARD_EXPIRY_WARN_DAYS = 90;

export type ContractCardExpiryTier = "expired" | "warn" | "normal";

/** Whole days from today (local midnight) to expiry. Negative when past. */
export function daysToExpiry(
	expiresAt: string | null | undefined,
	now: Date = new Date(),
): number | null {
	if (!expiresAt) return null;
	try {
		const today = new Date(now);
		today.setHours(0, 0, 0, 0);
		const raw = expiresAt.includes("T") ? expiresAt : `${expiresAt}T12:00:00`;
		const expiry = new Date(raw);
		if (Number.isNaN(expiry.getTime())) return null;
		expiry.setHours(0, 0, 0, 0);
		return Math.round(
			(expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
		);
	} catch {
		return null;
	}
}

export function getExpiryTier(
	days: number | null,
): ContractCardExpiryTier | null {
	if (days == null) return null;
	if (days < 0) return "expired";
	if (days <= CONTRACT_CARD_EXPIRY_WARN_DAYS) return "warn";
	return "normal";
}

export function formatValueAbbrev(value: number | null | undefined): {
	display: string;
	accessible: string;
} {
	if (value == null || !Number.isFinite(value)) {
		return { display: "—", accessible: "No value on record" };
	}

	const sign = value < 0 ? "-" : "";
	const abs = Math.abs(value);
	const full = `${value.toLocaleString("en-US", {
		maximumFractionDigits: 0,
	})} US dollars`;

	if (abs >= 1_000_000) {
		return {
			display: `${sign}$${(abs / 1_000_000).toFixed(2)}M`,
			accessible: full,
		};
	}
	if (abs >= 1_000) {
		return {
			display: `${sign}$${Math.round(abs / 1_000)}K`,
			accessible: full,
		};
	}
	return {
		display: `${sign}$${Math.round(abs)}`,
		accessible: full,
	};
}

/** Compact file-type label for the header glyph (PDF, DOCX, …). */
export function fileTypeGlyphLabel(
	extension?: string | null,
	type?: string | null,
): string {
	const ext = extension?.replace(/^\./, "").trim().toUpperCase();
	if (ext) return ext.slice(0, 5);
	const t = type?.trim().toUpperCase();
	if (t) return t.slice(0, 5);
	return "FILE";
}

export function fileTypeGlyphTone(
	extension?: string | null,
): "document" | "spreadsheet" | "neutral" {
	const ext = extension?.replace(/^\./, "").trim().toLowerCase() ?? "";
	if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "spreadsheet";
	if (["pdf", "doc", "docx", "txt", "rtf", "odt"].includes(ext)) {
		return "document";
	}
	return "neutral";
}

/** Signature / send qualifier for the meta line (not a fourth chip). */
export function contractSubStatus(file: {
	signatureDisplay?: { stage?: string };
	digitalSignatureStatus?: string | null;
}): string | null {
	const stage = file.signatureDisplay?.stage;
	if (stage === "not_sent") return "Not sent";
	if (stage === "sent") return "Sent";
	if (stage === "countersign") return "Countersign";

	const ds = file.digitalSignatureStatus?.toLowerCase();
	if (!ds) return null;
	if (ds === "not_started") return "Not sent";
	if (ds === "pending") return "Signature pending";
	if (ds === "completed") return "Signed";
	if (ds === "declined") return "Declined";
	if (ds === "expired") return "Signature expired";
	return null;
}
