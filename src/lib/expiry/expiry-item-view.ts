/**
 * One normalized shape for a queue item, so the modal, queue strip and queue
 * summary all read the same fields instead of each reaching into `file` /
 * `license` on their own.
 */

import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";
import { formatExpiryTypeLabel } from "./expiry-format";
import type { ExpiryQueueItem } from "./expiry-queue";

export type ExpiryItemContact = {
	email?: string;
	phone?: string;
};

export type ExpiryItemView = {
	kind: "contract" | "license";
	id: string;
	title: string;
	/** Raw stored date string (may be empty). */
	expiresAt: string;
	days: number;
	amount: number | null;
	/** "Amount" for contracts, "Annual cost" for licenses. */
	amountLabel: string;
	status: string | null;
	typeLabel: string | null;
	contact: ExpiryItemContact | null;
	/** Licenses that renew rather than lapse flip the verb to "Renews". */
	renewing: boolean;
};

function toFiniteNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number.parseFloat(value);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

/** Money value for a queue item, or null when the record has none. */
export function getItemAmount(item: ExpiryQueueItem): number | null {
	if (item.kind === "contract") {
		return toFiniteNumber(
			(item.file as UIFileDoc & { amount?: unknown }).amount,
		);
	}
	const license = item.license as License & {
		amount?: unknown;
		cost?: unknown;
	};
	return toFiniteNumber(license.amount ?? license.cost);
}

function getContractContact(file: UIFileDoc): ExpiryItemContact | null {
	const counterparty = file as UIFileDoc & {
		counterpartyContactEmail?: string;
		counterpartyContactPhone?: string;
	};
	const email = counterparty.counterpartyContactEmail?.trim() || undefined;
	const phone = counterparty.counterpartyContactPhone?.trim() || undefined;
	if (!email && !phone) return null;
	return { email, phone };
}

export function toExpiryItemView(item: ExpiryQueueItem): ExpiryItemView {
	if (item.kind === "contract") {
		const file = item.file;
		return {
			kind: "contract",
			id: item.id,
			title: file.contractName || file.name || "Untitled Contract",
			expiresAt: file.contractExpiryDate || "",
			days: item.days,
			amount: getItemAmount(item),
			amountLabel: "Amount",
			status: file.status || null,
			typeLabel: file.contractType
				? formatExpiryTypeLabel(file.contractType)
				: null,
			contact: getContractContact(file),
			renewing: false,
		};
	}

	const license = item.license;
	return {
		kind: "license",
		id: item.id,
		title: license.licenseName || "Untitled License",
		expiresAt: license.licenseExpiryDate || license.expirationDate || "",
		days: item.days,
		amount: getItemAmount(item),
		amountLabel: "Annual cost",
		status: license.status || null,
		typeLabel: license.licenseType
			? formatExpiryTypeLabel(license.licenseType)
			: null,
		// Licenses carry no counterparty contact fields today.
		contact: null,
		// Spec: licences that renew rather than lapse use "Renews" in the band.
		renewing: license.autoRenew === true,
	};
}
