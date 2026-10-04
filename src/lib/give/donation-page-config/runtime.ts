import { createAppwriteDonationPageConfigStore } from "./appwrite-store";
import { createDonationPageConfigService } from "./service";
import { createLiveDonationStripePricePort } from "@/lib/stripe/donation-page-config-prices";

async function getActiveDonationSubscriptionPriceIds(
	orgId: string,
): Promise<Set<string>> {
	const store = createAppwriteDonationPageConfigStore();
	const active = new Set<string>();
	const published = await store.getPublished(orgId);
	if (published) {
		for (const priceId of Object.values(
			published.payload.stripePriceByAmountCents,
		)) {
			if (priceId) active.add(priceId);
		}
	}
	const replacements = await store.listPriceReplacements(orgId);
	for (const row of replacements) {
		active.add(row.stripePriceId);
	}
	return active;
}

let cachedService: ReturnType<typeof createDonationPageConfigService> | null =
	null;

export function getDonationPageConfigService() {
	if (!cachedService) {
		cachedService = createDonationPageConfigService({
			store: createAppwriteDonationPageConfigStore(),
			stripe: createLiveDonationStripePricePort(),
			getActiveSubscriptionPriceIds: getActiveDonationSubscriptionPriceIds,
		});
	}
	return cachedService;
}
