export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import RoleDetail from "./RoleDetail";

export default async function RoleDetailPage({
	params,
}: {
	params: Promise<{ roleId: string }>;
}) {
	let currentUser = await getCurrentUser();
	if (!currentUser) {
		currentUser = await getCurrentUserFrom2FA();
	}

	if (!currentUser) {
		redirect("/sign-in");
	}

	const { roleId } = await params;

	return <RoleDetail roleId={roleId} />;
}
