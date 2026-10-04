export type DonationPageConfigErrorCode =
	| "VALIDATION"
	| "STALE_DRAFT"
	| "VERSION_NOT_FOUND"
	| "NOT_INITIALIZED";

export class DonationPageConfigError extends Error {
	constructor(
		message: string,
		public readonly code: DonationPageConfigErrorCode,
		public readonly status = 400,
	) {
		super(message);
		this.name = "DonationPageConfigError";
	}
}
