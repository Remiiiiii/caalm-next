import { verifyDonationPagePreviewToken } from "@/lib/give/donation-page-config/preview-token";
import { getDonationPageConfigService } from "@/lib/give/donation-page-config/runtime";
import { DEFAULT_DONATION_PAGE_CONFIG } from "@/lib/give/donation-page-config/types";
import {
	toPublicDonationPageConfig,
	type PublicDonationPageConfig,
} from "@/lib/give/public-donation-config";

export async function resolvePublicDonationConfigForOrg(
	orgId: string,
	options?: { previewToken?: string | null; fallbackEin?: string | null },
): Promise<{ config: PublicDonationPageConfig; source: "draft" | "published" }> {
	const service = getDonationPageConfigService();
	const previewToken = options?.previewToken?.trim();
	if (previewToken) {
		const verified = verifyDonationPagePreviewToken(previewToken);
		if (verified.ok && verified.orgId === orgId) {
			const draft = await service.getOrCreateDraft(orgId);
			return {
				config: toPublicDonationPageConfig(draft.payload),
				source: "draft",
			};
		}
	}
	const published = await service.getPublished(orgId);
	if (published) {
		return {
			config: toPublicDonationPageConfig(published.payload),
			source: "published",
		};
	}
	const fallback = DEFAULT_DONATION_PAGE_CONFIG();
	if (options?.fallbackEin?.trim()) {
		fallback.ein = options.fallbackEin.trim();
	}
	return {
		config: toPublicDonationPageConfig(fallback),
		source: "published",
	};
}
