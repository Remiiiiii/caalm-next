import { GRANT_CAPABLE_CONTRACT_TYPES } from "@/lib/gifts/grant-contract";

export class GrantFundValidationError extends Error {
	status: number;
	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

export function contractRequiresFundId(contractType: string | undefined): boolean {
	if (!contractType) return false;
	return GRANT_CAPABLE_CONTRACT_TYPES.has(contractType);
}

export function assertGrantFundIdOnSave(input: {
	contractType?: string;
	fundId?: string | null;
}): void {
	if (!contractRequiresFundId(input.contractType)) return;
	const fundId = input.fundId?.trim();
	if (!fundId) {
		throw new GrantFundValidationError(
			"Grant contracts require a fund selection",
			400,
		);
	}
}

export function isGrantMissingFund(input: {
	contractType?: string;
	fundId?: string | null;
}): boolean {
	if (!contractRequiresFundId(input.contractType)) return false;
	return !input.fundId?.trim();
}
