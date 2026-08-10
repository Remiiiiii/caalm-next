import {
	countByKind,
	type ExpiryQueueItem,
} from "@/lib/expiry/expiry-queue";
import { formatContractForSpeech } from "@/lib/contract-speech";
import { formatLicenseForSpeech } from "@/lib/license-speech";
import { normalizeSpeechPronunciation } from "@/lib/speech-pronunciation";

export type ExpirySpeechMode = "open" | "navigate";

function buildMultiItemIntro(items: ExpiryQueueItem[]): string {
	const total = items.length;
	const { contracts, licenses } = countByKind(items);

	let countPhrase: string;
	if (contracts > 0 && licenses > 0) {
		const cLabel = contracts === 1 ? "contract" : "contracts";
		const lLabel = licenses === 1 ? "license" : "licenses";
		countPhrase = `You have ${total} items expiring soon: ${contracts} ${cLabel} and ${licenses} ${lLabel}.`;
	} else if (licenses > 0) {
		const lLabel = licenses === 1 ? "license" : "licenses";
		countPhrase = `You have ${licenses} ${lLabel} expiring soon.`;
	} else {
		const cLabel = contracts === 1 ? "contract" : "contracts";
		countPhrase = `You have ${contracts} ${cLabel} expiring soon.`;
	}

	return `${countPhrase} Let's begin with the first item on the list.`;
}

function formatItemBody(
	item: ExpiryQueueItem,
	options: {
		index: number;
		total: number;
		userFullName?: string;
		includeGreeting: boolean;
	},
): string {
	if (item.kind === "contract") {
		return formatContractForSpeech({
			contract: item.file,
			contractIndex: options.index,
			totalContracts: options.total,
			userFullName: options.userFullName,
			daysUntilExpiry: item.days,
			speechSegment: "itemOnly",
			includeGreeting: options.includeGreeting,
		});
	}

	return formatLicenseForSpeech({
		license: item.license,
		itemIndex: options.index,
		totalItems: options.total,
		userFullName: options.userFullName,
		daysUntilExpiry: item.days,
		speechSegment: "itemOnly",
		includeGreeting: options.includeGreeting,
	});
}

/**
 * Build TTS script for the expiry carousel.
 * - Single item: full default item speech (with greeting).
 * - Multi + open (index 0): count intro + "Let's begin with the first item on the list" + item body.
 * - Multi + navigate: item body only (no list intro).
 */
export function formatExpiryQueueSpeech(options: {
	items: ExpiryQueueItem[];
	index: number;
	mode: ExpirySpeechMode;
	userFullName?: string;
}): string {
	const { items, index, mode, userFullName } = options;
	const item = items[index];
	if (!item) return "";

	const total = items.length;

	if (total === 1) {
		return normalizeSpeechPronunciation(
			formatItemBody(item, {
				index: 0,
				total: 1,
				userFullName,
				includeGreeting: true,
			}),
		);
	}

	if (mode === "open" && index === 0) {
		const intro = buildMultiItemIntro(items);
		const body = formatItemBody(item, {
			index,
			total,
			userFullName,
			includeGreeting: true,
		});
		return normalizeSpeechPronunciation(`${intro} ${body}`);
	}

	return normalizeSpeechPronunciation(
		formatItemBody(item, {
			index,
			total,
			userFullName,
			includeGreeting: false,
		}),
	);
}
