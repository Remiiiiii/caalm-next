export const PLEDGE_STATUSES = ["active", "fulfilled", "cancelled"] as const;
export type PledgeStatus = (typeof PLEDGE_STATUSES)[number];

export const INSTALLMENT_STATUSES = [
	"pending",
	"draft_created",
	"paid",
	"skipped",
] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export type Pledge = {
	$id: string;
	orgId: string;
	constituentId: string;
	totalAmount: number;
	currency: string;
	status: PledgeStatus;
};

export type PledgeInstallment = {
	$id: string;
	orgId: string;
	pledgeId: string;
	dueDate: string;
	amount: number;
	status: InstallmentStatus;
	giftId?: string;
	skipReason?: string;
};
