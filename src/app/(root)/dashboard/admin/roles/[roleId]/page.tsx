export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import RoleDetail from "./RoleDetail";

export default async function RoleDetailPage({
	params,
}: {
	params: { roleId: string };
}) {
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		redirect("/sign-in");
	}

	return <RoleDetail roleId={params.roleId} />;
}
