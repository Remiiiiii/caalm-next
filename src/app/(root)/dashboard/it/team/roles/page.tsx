"use client";

import { Shield } from "lucide-react";
import RolesManagement from "@/app/(root)/dashboard/admin/roles/RolesManagement";
import { ITPageShell } from "@/components/it/ITPageShell";

export default function ITTeamRolesPage() {
	return (
		<ITPageShell
			title="Team Roles"
			subtitle="Role definitions and permission assignments"
			icon={Shield}
		>
			<RolesManagement />
		</ITPageShell>
	);
}
