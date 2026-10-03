import { DonationPageConfigError } from "./errors";
import type {
	DonationFrequencyOption,
	DonationPageConfigPayload,
} from "./types";

export const MAX_SUGGESTED_AMOUNTS = 6;
export const MAX_DESIGNATION_LENGTH = 120;
export const MAX_DESIGNATIONS = 20;

const EIN_PATTERN = /^\d{2}-\d{7}$/;

const FREQUENCY_SET = new Set<DonationFrequencyOption>([
	"one_time",
	"monthly",
]);

export function isValidEin(ein: string): boolean {
	return EIN_PATTERN.test(ein.trim());
}

export function validateDonationPageConfigPayload(
	payload: DonationPageConfigPayload,
): void {
	const amounts = payload.amountsCents ?? [];
	if (amounts.length === 0) {
		throw new DonationPageConfigError(
			"At least one suggested amount is required",
			"VALIDATION",
		);
	}
	if (amounts.length > MAX_SUGGESTED_AMOUNTS) {
		throw new DonationPageConfigError(
			`At most ${MAX_SUGGESTED_AMOUNTS} suggested amounts are allowed`,
			"VALIDATION",
		);
	}
	for (let i = 0; i < amounts.length; i++) {
		const cents = amounts[i];
		if (!Number.isInteger(cents) || cents <= 0) {
			throw new DonationPageConfigError(
				"Suggested amounts must be positive integers (cents)",
				"VALIDATION",
			);
		}
		if (i > 0 && cents <= amounts[i - 1]) {
			throw new DonationPageConfigError(
				"Suggested amounts must be strictly ascending",
				"VALIDATION",
			);
		}
	}

	const designations = payload.designations ?? [];
	if (designations.length === 0) {
		throw new DonationPageConfigError(
			"At least one fund designation is required",
			"VALIDATION",
		);
	}
	if (designations.length > MAX_DESIGNATIONS) {
		throw new DonationPageConfigError(
			`At most ${MAX_DESIGNATIONS} designations are allowed`,
			"VALIDATION",
		);
	}
	const seen = new Set<string>();
	for (const label of designations) {
		const trimmed = label.trim();
		if (!trimmed) {
			throw new DonationPageConfigError(
				"Designations cannot be empty",
				"VALIDATION",
			);
		}
		if (trimmed.length > MAX_DESIGNATION_LENGTH) {
			throw new DonationPageConfigError(
				`Designations must be at most ${MAX_DESIGNATION_LENGTH} characters`,
				"VALIDATION",
			);
		}
		const key = trimmed.toLowerCase();
		if (seen.has(key)) {
			throw new DonationPageConfigError(
				"Designations must be unique",
				"VALIDATION",
			);
		}
		seen.add(key);
	}

	if (!isValidEin(payload.ein)) {
		throw new DonationPageConfigError(
			"EIN must match format NN-NNNNNNN",
			"VALIDATION",
		);
	}

	const legal = payload.legalText?.trim() ?? "";
	if (!legal) {
		throw new DonationPageConfigError(
			"Legal disclosure text is required",
			"VALIDATION",
		);
	}

	const frequencies = payload.frequencyOptions ?? [];
	if (frequencies.length === 0) {
		throw new DonationPageConfigError(
			"At least one giving frequency must be enabled",
			"VALIDATION",
		);
	}
	for (const f of frequencies) {
		if (!FREQUENCY_SET.has(f)) {
			throw new DonationPageConfigError(
				"Invalid frequency option",
				"VALIDATION",
			);
		}
	}
}
