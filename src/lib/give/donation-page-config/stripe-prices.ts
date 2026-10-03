import type { DonationPageConfigPayload } from "./types";

export type CreateDonationStripePriceInput = {
	orgId: string;
	amountCents: number;
};

export type DonationStripePricePort = {
	createRecurringDonationPrice: (
		input: CreateDonationStripePriceInput,
	) => Promise<{ priceId: string }>;
};

/** In-memory fake for tests — records creates and rejects updates. */
export function createTestDonationStripePricePort(): DonationStripePricePort & {
	created: CreateDonationStripePriceInput[];
	updateCalls: number;
} {
	const created: CreateDonationStripePriceInput[] = [];
	let seq = 0;
	return {
		created,
		updateCalls: 0,
		createRecurringDonationPrice: async (input) => {
			created.push({ ...input });
			seq += 1;
			return { priceId: `price_test_${input.amountCents}_${seq}` };
		},
	};
}

function amountKey(cents: number): string {
	return String(cents);
}

/**
 * Ensures each suggested amount has a Stripe Price when monthly giving is enabled.
 * Never mutates existing Price objects — only creates new ones and records replacements.
 */
export async function syncStripePricesForPayload(input: {
	orgId: string;
	previous: DonationPageConfigPayload;
	next: DonationPageConfigPayload;
	stripe: DonationStripePricePort;
	activeSubscriptionPriceIds: Set<string>;
	nowIso?: string;
}): Promise<{
	payload: DonationPageConfigPayload;
	replacements: Array<{
		amountCents: number;
		stripePriceId: string;
		replacedByPriceId: string;
		replacedAt: string;
	}>;
}> {
	const nowIso = input.nowIso ?? new Date().toISOString();
	const offersMonthly = input.next.frequencyOptions.includes("monthly");
	const priceMap = { ...input.next.stripePriceByAmountCents };
	const replacements: Array<{
		amountCents: number;
		stripePriceId: string;
		replacedByPriceId: string;
		replacedAt: string;
	}> = [];

	if (!offersMonthly) {
		return { payload: { ...input.next, stripePriceByAmountCents: priceMap }, replacements };
	}

	const prevAmounts = input.previous.amountsCents;
	const nextAmounts = input.next.amountsCents;

	for (const amountCents of nextAmounts) {
		const key = amountKey(amountCents);
		const hadSameAmount = prevAmounts.includes(amountCents);
		const existingPriceId = priceMap[key] ?? input.previous.stripePriceByAmountCents[key];

		if (hadSameAmount && existingPriceId) {
			priceMap[key] = existingPriceId;
			continue;
		}

		const { priceId: newPriceId } =
			await input.stripe.createRecurringDonationPrice({
				orgId: input.orgId,
				amountCents,
			});

		if (existingPriceId && existingPriceId !== newPriceId) {
			if (input.activeSubscriptionPriceIds.has(existingPriceId)) {
				replacements.push({
					amountCents,
					stripePriceId: existingPriceId,
					replacedByPriceId: newPriceId,
					replacedAt: nowIso,
				});
			}
		}

		priceMap[key] = newPriceId;
	}

	for (const oldCents of prevAmounts) {
		if (nextAmounts.includes(oldCents)) continue;
		const oldKey = amountKey(oldCents);
		const oldPriceId = input.previous.stripePriceByAmountCents[oldKey];
		if (!oldPriceId || !input.activeSubscriptionPriceIds.has(oldPriceId)) {
			continue;
		}
		const fallbackNew =
			priceMap[amountKey(nextAmounts[0] ?? oldCents)] ?? oldPriceId;
		replacements.push({
			amountCents: oldCents,
			stripePriceId: oldPriceId,
			replacedByPriceId: fallbackNew,
			replacedAt: nowIso,
		});
	}

	return {
		payload: { ...input.next, stripePriceByAmountCents: priceMap },
		replacements,
	};
}
