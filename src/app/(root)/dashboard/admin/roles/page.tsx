export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import RolesManagement from "./RolesManagement";

export default async function RolesManagementPage() {
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		redirect("/sign-in");
	}

	return <RolesManagement />;
}
