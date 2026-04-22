import { redirect } from "next/navigation";
import { getDashboardHomeRedirectPath } from "@/lib/auth/dashboard-guards";

export const dynamic = "force-dynamic";

/**
 * Canonical entry for `/dashboard`: send the user to their role-specific home.
 */
export default async function DashboardIndexPage() {
	const path = await getDashboardHomeRedirectPath();
	if (!path) {
		redirect("/sign-in");
	}
	redirect(path);
}
