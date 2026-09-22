import Link from "next/link";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { getCampaignById } from "@/lib/campaigns/repository";
import { sumPostedGiftTotalForCampaign } from "@/lib/gifts/repository";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { Card, CardContent } from "@/components/ui/card";

type PageProps = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: PageProps) {
	await requirePagePermission(PERMISSIONS.GIFTS.VIEW);
	const { id } = await params;
	const user = await getCurrentUser();
	const orgId = user
		? (await getUserDefaultOrganization(user.$id))?.orgId
		: undefined;
	if (!orgId) {
		return <p className="p-4 text-slate-600">Organization not found.</p>;
	}
	const campaign = await getCampaignById(id, orgId);
	if (!campaign) {
		return (
			<p className="p-4 text-slate-600">
				Campaign not found.{" "}
				<Link href="/campaigns" className="text-[#0f5384]">
					Back
				</Link>
			</p>
		);
	}
	const postedTotal = await sumPostedGiftTotalForCampaign(orgId, id);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4">
				<h1 className="h1 capitalize sidebar-gradient-text">{campaign.name}</h1>
			</div>
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-2 text-sm text-slate-700">
					<p>
						Posted gift total:{" "}
						<span className="tabular-nums font-medium">
							{campaign.currency}{" "}
							{postedTotal.toLocaleString(undefined, {
								minimumFractionDigits: 2,
							})}
						</span>
					</p>
					{campaign.goalAmount != null ? (
						<p>
							Goal:{" "}
							<span className="tabular-nums">
								{campaign.goalAmount.toLocaleString()}
							</span>
						</p>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
