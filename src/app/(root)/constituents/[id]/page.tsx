import { notFound, redirect } from "next/navigation";
import { ConstituentProfile } from "@/components/constituents/ConstituentProfile";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getConstituentById,
	markPiiAccessed,
} from "@/lib/constituents";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export default async function ConstituentProfilePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const user = await requirePagePermission(PERMISSIONS.CONSTITUENTS.VIEW);
	const org = await getUserDefaultOrganization(user.$id);
	const { id } = await params;
	const constituent = await getConstituentById(id);
	if (!constituent || !org?.orgId || constituent.orgId !== org.orgId) {
		notFound();
	}
	if (constituent.mergedIntoId) {
		redirect(`/constituents/${constituent.mergedIntoId}`);
	}

	await markPiiAccessed(id);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<ConstituentProfile constituent={constituent} />
		</div>
	);
}
