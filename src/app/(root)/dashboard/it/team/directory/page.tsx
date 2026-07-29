"use client";

import { Users } from "lucide-react";
import UserManagement from "@/app/(root)/dashboard/UserManagement";
import { ITPageShell } from "@/components/it/ITPageShell";

export default function ITTeamDirectoryPage() {
	return (
		<ITPageShell
			title="Team Directory"
			subtitle="Organization users and role assignments"
			icon={Users}
		>
			<UserManagement />
		</ITPageShell>
	);
}
