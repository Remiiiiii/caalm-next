export type Campaign = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	orgId: string;
	name: string;
	goalAmount?: number;
	currency: string;
	startDate?: string;
	endDate?: string;
	campaignCost?: number;
};

export type CreateCampaignInput = {
	orgId: string;
	name: string;
	goalAmount?: number;
	currency?: string;
	startDate?: string;
	endDate?: string;
};

export type UpdateCampaignInput = Partial<
	Omit<CreateCampaignInput, "orgId"> & { campaignCost?: number | null }
>;
