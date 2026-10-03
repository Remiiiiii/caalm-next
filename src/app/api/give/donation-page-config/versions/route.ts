import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getUserById } from "@/lib/actions/user.actions";
import { needsPublisherNameLookup } from "@/lib/give/donation-page-config/actor";
import { donationPageConfigErrorResponse } from "@/lib/give/donation-page-config/http";
import { getDonationPageConfigService } from "@/lib/give/donation-page-config/runtime";
import type { DonationPageConfigVersion } from "@/lib/give/donation-page-config/types";
import { requireGiveOrgContext } from "@/lib/give/request-context";

async function enrichPublisherNames(
	versions: DonationPageConfigVersion[],
): Promise<DonationPageConfigVersion[]> {
	const idsNeedingLookup = [
		...new Set(
			versions
				.filter((v) => needsPublisherNameLookup(v.publishedByName))
				.map((v) => v.publishedByUserId)
				.filter(Boolean),
		),
	];
	if (idsNeedingLookup.length === 0) return versions;

	const nameById = new Map<string, string>();
	await Promise.all(
		idsNeedingLookup.map(async (userId) => {
			const row = await getUserById(userId);
			if (!row) return;
			const fullName = String(
				(row as { fullName?: string }).fullName || "",
			).trim();
			const email = String((row as { email?: string }).email || "").trim();
			const resolved = fullName || email;
			if (resolved) nameById.set(userId, resolved);
		}),
	);

	if (nameById.size === 0) return versions;

	return versions.map((version) => {
		if (!needsPublisherNameLookup(version.publishedByName)) return version;
		const resolved = nameById.get(version.publishedByUserId);
		if (!resolved) return version;
		return { ...version, publishedByName: resolved };
	});
}

export async function GET(request: NextRequest) {
	const ctx = await requireGiveOrgContext(
		request,
		PERMISSIONS.DONATIONS.CONFIG_VIEW,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const service = getDonationPageConfigService();
		const versions = await enrichPublisherNames(
			await service.listVersions(ctx.orgId),
		);
		return NextResponse.json({ versions });
	} catch (error) {
		return donationPageConfigErrorResponse(error);
	}
}
