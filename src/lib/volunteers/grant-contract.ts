import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";

export async function assertGrantContractInOrg(
	orgId: string,
	grantContractId: string,
): Promise<void> {
	await loadContractForOrg(grantContractId, orgId);
}
