"use client";

import { BarChart3, CalendarCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDivisionName, type UserDivision } from "../../../../constants";

interface DepartmentDashboardHeaderProps {
	division: string;
	departmentLabel: string;
	userName?: string;
}

export function DepartmentDashboardHeader({
	division,
	departmentLabel,
	userName,
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

	const divisionLabel = division
		? formatDivisionName(division as UserDivision)
		: "Your division";

	return (
		<div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div className="min-w-0">
				<div className="flex items-center gap-4 mb-1">
					<h1 className="h1 capitalize sidebar-gradient-text">
						Department dashboard
					</h1>
				</div>
				<p className="text-md text-slate-600 max-w-3xl">
					{userName ? `Welcome back, ${userName}. ` : null}
				</p>
				<p className="text-sm text-slate-600 max-w-3xl">
					Division | {divisionLabel} · Department |{" "}
					{departmentLabel ? ` ${departmentLabel}` : null}
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-3 shrink-0">
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
			</div>
		</div>
	);
}
