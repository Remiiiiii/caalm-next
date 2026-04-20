export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import ManagerDashboard from "../ManagerDashboard";

export default async function ManagerDashboardPage() {
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		redirect("/sign-in");
	}

	return <ManagerDashboard />;
}
