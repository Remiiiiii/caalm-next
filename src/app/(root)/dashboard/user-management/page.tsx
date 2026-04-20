export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import UserManagement from "../UserManagement";

export default async function UserManagementPage() {
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		redirect("/sign-in");
	}

	return <UserManagement />;
}
