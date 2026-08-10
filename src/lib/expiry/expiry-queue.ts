import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";

export const EXPIRY_MODAL_SHOWN_KEY = "expiryModalShown";
export const EXPIRY_WINDOW_DAYS = 30;

export type ExpiryQueueItem =
	| { kind: "contract"; id: string; file: UIFileDoc; days: number }
	| { kind: "license"; id: string; license: License; days: number };

export type ExpiryShownState = {
	contracts: string[];
	licenses: string[];
};

/**
 * Days until expiry using local calendar dates (same as ContractsMetricsBar).
 */
export function calculateDaysUntilExpiry(
	expiryDate: string | undefined | null,
): number | null {
	if (!expiryDate) return null;

	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const expiryStr = expiryDate.split("T")[0];
		const [year, month, day] = expiryStr.split("-").map(Number);
		const expiry = new Date(year, month - 1, day);
		expiry.setHours(0, 0, 0, 0);

		const diffTime = expiry.getTime() - today.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	} catch {
		return null;
	}
}

function isContractSnoozed(file: UIFileDoc, today: Date): boolean {
	const snoozedUntil = (file as UIFileDoc & { snoozedUntil?: string })
		.snoozedUntil;
	if (!snoozedUntil) return false;
	try {
		const snoozeDate = new Date(snoozedUntil);
		snoozeDate.setHours(0, 0, 0, 0);
		return snoozeDate > today;
	} catch {
		return false;
	}
}

function itemName(item: ExpiryQueueItem): string {
	if (item.kind === "contract") {
		return item.file.contractName || item.file.name || "";
	}
	return item.license.licenseName || "";
}

function itemExpiryRaw(item: ExpiryQueueItem): string {
	if (item.kind === "contract") {
		return item.file.contractExpiryDate || "";
	}
	return item.license.licenseExpiryDate || item.license.expirationDate || "";
}

export function buildExpiryQueue(options: {
	contracts: UIFileDoc[];
	licenses: License[];
	shown?: ExpiryShownState;
	/** When true, skip 0–30 filter (test / deep-link). Still sorts. */
	bypassWindow?: boolean;
}): ExpiryQueueItem[] {
	const {
		contracts,
		licenses,
		shown = { contracts: [], licenses: [] },
		bypassWindow = false,
	} = options;
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const shownContracts = new Set(shown.contracts);
	const shownLicenses = new Set(shown.licenses);
	const items: ExpiryQueueItem[] = [];

	for (const file of Array.isArray(contracts) ? contracts : []) {
		if (!file?.$id || shownContracts.has(file.$id)) continue;
		if (isContractSnoozed(file, today)) continue;
		const days = calculateDaysUntilExpiry(file.contractExpiryDate);
		if (days === null) continue;
		if (!bypassWindow && (days < 0 || days > EXPIRY_WINDOW_DAYS)) continue;
		items.push({ kind: "contract", id: file.$id, file, days });
	}

	for (const license of Array.isArray(licenses) ? licenses : []) {
		if (!license?.$id || shownLicenses.has(license.$id)) continue;
		if (license.status === "expired") continue;
		const days = calculateDaysUntilExpiry(
			license.licenseExpiryDate || license.expirationDate,
		);
		if (days === null) continue;
		if (!bypassWindow && (days < 0 || days > EXPIRY_WINDOW_DAYS)) continue;
		items.push({ kind: "license", id: license.$id, license, days });
	}

	items.sort((a, b) => {
		if (a.days !== b.days) return a.days - b.days;
		const dateCmp = itemExpiryRaw(a).localeCompare(itemExpiryRaw(b));
		if (dateCmp !== 0) return dateCmp;
		return itemName(a).localeCompare(itemName(b));
	});

	return items;
}

/** Migrate legacy string[] of contract IDs to structured state. */
export function parseExpiryShownState(raw: string | null): ExpiryShownState {
	if (!raw) return { contracts: [], licenses: [] };
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (Array.isArray(parsed)) {
			return {
				contracts: parsed.filter((id): id is string => typeof id === "string"),
				licenses: [],
			};
		}
		if (parsed && typeof parsed === "object") {
			const obj = parsed as Partial<ExpiryShownState>;
			return {
				contracts: Array.isArray(obj.contracts)
					? obj.contracts.filter((id): id is string => typeof id === "string")
					: [],
				licenses: Array.isArray(obj.licenses)
					? obj.licenses.filter((id): id is string => typeof id === "string")
					: [],
			};
		}
	} catch {
		// ignore
	}
	return { contracts: [], licenses: [] };
}

export function loadExpiryShownState(): ExpiryShownState {
	if (typeof window === "undefined") return { contracts: [], licenses: [] };
	try {
		return parseExpiryShownState(
			sessionStorage.getItem(EXPIRY_MODAL_SHOWN_KEY),
		);
	} catch {
		return { contracts: [], licenses: [] };
	}
}

export function saveExpiryShownState(state: ExpiryShownState): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.setItem(EXPIRY_MODAL_SHOWN_KEY, JSON.stringify(state));
	} catch {
		// ignore quota / private mode
	}
}

export function mergeShownWithItems(
	current: ExpiryShownState,
	items: ExpiryQueueItem[],
): ExpiryShownState {
	const contracts = new Set(current.contracts);
	const licenses = new Set(current.licenses);
	for (const item of items) {
		if (item.kind === "contract") contracts.add(item.id);
		else licenses.add(item.id);
	}
	return {
		contracts: Array.from(contracts),
		licenses: Array.from(licenses),
	};
}

export function expiryItemKey(item: ExpiryQueueItem, index: number): string {
	return `${item.kind}:${item.id}:${index}`;
}

export function countByKind(items: ExpiryQueueItem[]): {
	contracts: number;
	licenses: number;
} {
	let contracts = 0;
	let licenses = 0;
	for (const item of items) {
		if (item.kind === "contract") contracts += 1;
		else licenses += 1;
	}
	return { contracts, licenses };
}
