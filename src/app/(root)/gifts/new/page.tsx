import { CreateGiftPageClient } from "@/components/gifts/CreateGiftPageClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function NewGiftPage() {
	await requirePagePermission(PERMISSIONS.GIFTS.CREATE);
	return <CreateGiftPageClient />;
}
