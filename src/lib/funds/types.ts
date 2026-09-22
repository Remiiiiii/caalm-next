import type { NetAssetClass } from "./constants";

export type OrgFund = {
	$id: string;
	orgId: string;
	code: string;
	name: string;
	netAssetClass: NetAssetClass;
	createdAt: string;
};

export type CreateOrgFundInput = {
	orgId: string;
	code: string;
	name: string;
	netAssetClass: NetAssetClass;
};
