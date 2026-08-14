"use client";

import { BarChart3, CalendarCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import {
	DashboardGreeting,
	type DashboardGreetingUser,
} from "@/components/dashboard/DashboardGreeting";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";

interface DepartmentDashboardHeaderProps {
	division: string;
	departmentLabel: string;
	userName?: string;
	user?: DashboardGreetingUser | null;
}

export function DepartmentDashboardHeader({
	division,
	departmentLabel,
	userName,
	user,
}: DepartmentDashboardHeaderProps) {
	const { permissions } = usePermissions();
	const canApprove =
		permissions.includes(PERMISSIONS.CONTRACTS.APPROVE) ||
		permissions.includes(PERMISSIONS.CONTRACTS.REVIEW) ||
		permissions.includes(PERMISSIONS.EVENTS.APPROVE);
	const canInvite = permissions.includes(PERMISSIONS.USERS.INVITE);
	const canViewAnalytics =
		permissions.includes(PERMISSIONS.CONTRACTS.VIEW) ||
		permissions.includes(PERMISSIONS.CALENDAR.VIEW_TEAM);

	const greetingUser: DashboardGreetingUser | null = user
		? {
				...user,
				fullName: user.fullName || user.name || userName,
				division: user.division || division || null,
				departmentLabel: user.departmentLabel || departmentLabel || null,
				department: user.department || departmentLabel || null,
			}
		: userName
			? ({
					$id: "",
					fullName: userName,
					name: userName,
					division: division || null,
					departmentLabel: departmentLabel || null,
					department: departmentLabel || null,
				} as DashboardGreetingUser)
			: null;

	const actions = (
		<>
			{canApprove ? (
				<Button className="primary-btn px-3 sm:px-4 cursor-pointer" asChild>
					<Link href="/contracts/approvals">
						<CalendarCheck className="h-4 w-4" />
						Review approvals
					</Link>
				</Button>
			) : null}
			{canViewAnalytics && division ? (
				<Button
					variant="outline"
					className="primary-btn px-3 sm:px-4 cursor-pointer"
					asChild
				>
					<Link href={`/analytics/${division}`}>
						<BarChart3 className="h-4 w-4" />
						Division analytics
					</Link>
				</Button>
			) : null}
			{canInvite ? (
				<Button
					variant="outline"
					className="primary-btn px-3 sm:px-4 cursor-pointer"
					asChild
				>
					<Link href="/dashboard/user-management">
						<UserPlus className="h-4 w-4" />
						Invite team member
					</Link>
				</Button>
			) : null}
		</>
	);

	return (
		<DashboardGreeting
			user={greetingUser}
			actions={
				canApprove || (canViewAnalytics && division) || canInvite
					? actions
					: undefined
			}
		/>
	);
}
