import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { GiftDomainError } from "./repository";

/** Contract types that may receive grant-related gift cash (2.10). */
export const GRANT_CAPABLE_CONTRACT_TYPES = new Set([
	"Grant_Agreement",
	"Government_Grant",
	"Donation_Agreement",
	"Fiscal_Sponsorship",
]);

export async function assertGrantContractForOrg(
	contractId: string,
	orgId: string,
): Promise<void> {
	try {
		const row = await loadContractForOrg(contractId, orgId);
		const contractType = String(row.contractType || "");
		if (!GRANT_CAPABLE_CONTRACT_TYPES.has(contractType)) {
			throw new GiftDomainError(
				"Contract must be a grant or donor-restriction type",
				400,
			);
		}
	} catch (error) {
		if (error instanceof GiftDomainError) throw error;
		throw new GiftDomainError("Contract not found", 400);
	}
}
