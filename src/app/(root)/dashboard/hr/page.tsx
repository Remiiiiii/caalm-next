export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import HRDashboard from "../HRDashboard";

export default async function HRDashboardPage() {
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		redirect("/sign-in");
	}

	return <HRDashboard />;
}
