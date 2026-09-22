import { GiftsPageClient } from "@/components/gifts/GiftsPageClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function GiftsPage() {
	await requirePagePermission(PERMISSIONS.GIFTS.VIEW);
	return <GiftsPageClient />;
}
