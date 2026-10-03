/** Tag used by the public give page config CDN / Next cache layer. */
export function publicDonationPageConfigCacheTag(orgId: string): string {
	return `give:donation-page-config:${orgId}`;
}

export type DonationPageConfigCacheInvalidator = (
	orgId: string,
) => Promise<void>;

/** Default hook: Next.js cache tag revalidation when available. */
export async function invalidatePublicDonationPageConfigCache(
	orgId: string,
): Promise<void> {
	try {
		const { revalidateTag } = await import("next/cache");
		revalidateTag(publicDonationPageConfigCacheTag(orgId), "max");
	} catch {
		// Unit tests and non-Next contexts may not provide next/cache.
	}
}
