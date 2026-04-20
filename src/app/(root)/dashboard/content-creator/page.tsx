export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import { getUserPermissions } from "@/lib/rbac/permissions";
import ContentCreatorDashboard from "./ContentCreatorDashboard";

export default async function ContentCreatorDashboardPage() {
	// Try to get user from session first, then fall back to 2FA-based auth
	let currentUser = await getCurrentUser();
	if (!currentUser) {
		currentUser = await getCurrentUserFrom2FA();
	}

	if (!currentUser) {
		redirect("/sign-in");
	}

	// Check if user has Content Creator role or news.read permission
	const userPermissions = await getUserPermissions(currentUser.$id);
	const hasNewsPermission =
		userPermissions.includes(PERMISSIONS.NEWS.READ) ||
		userPermissions.includes(PERMISSIONS.NEWS.CREATE) ||
		userPermissions.includes(PERMISSIONS.NEWS.UPDATE);

	if (!hasNewsPermission) {
		redirect("/dashboard");
	}

	return <ContentCreatorDashboard user={currentUser} />;
}
