export const dynamic = "force-dynamic";

import { requirePageAuth } from "@/lib/rbac/page-guards";
import AnalyticsPageClient from "./AnalyticsPageClient";

export default async function AnalyticsPage() {
	const user = await requirePageAuth();
	return <AnalyticsPageClient userId={user.$id} />;
}
