import { GiftDetailClient } from "@/components/gifts/GiftDetailClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

type PageProps = { params: Promise<{ id: string }> };

export default async function GiftDetailPage({ params }: PageProps) {
	await requirePagePermission(PERMISSIONS.GIFTS.VIEW);
	const { id } = await params;
	return <GiftDetailClient giftId={id} />;
}
