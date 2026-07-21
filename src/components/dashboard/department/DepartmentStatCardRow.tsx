"use client";

import {
	AlertCircle,
	CheckCircle2,
	ClipboardList,
	FileText,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardSkeleton } from "@/components/ui/skeletons";
import type { DepartmentDashboardStats } from "@/lib/dashboard/department-dashboard.types";

interface DepartmentStatCardRowProps {
	stats: DepartmentDashboardStats | null;
	isLoading?: boolean;
	division?: string;
}

export function DepartmentStatCardRow({
	stats,
	isLoading,
	division,
}: DepartmentStatCardRowProps) {
	if (isLoading || !stats) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
				{[1, 2, 3, 4].map((i) => (
					<StatCardSkeleton key={i} />
				))}
			</div>
		);
	}

	const cards = [
		{
			title: "Department contracts",
			value: stats.totalContracts,
			description: "Contracts in your division",
			icon: FileText,
			href: "/my-contracts",
		},
		{
			title: "Expiring soon",
			value: stats.expiringSoon,
			description: "Within the next 90 days",
			icon: AlertCircle,
			href: "/my-contracts",
		},
		{
			title: "Pending approvals",
			value: stats.pendingApprovals,
			description: "Calendar and contract reviews",
			icon: ClipboardList,
			href: "/contracts/approvals",
		},
		{
			title: "Compliance health",
			value: stats.complianceRate !== null ? `${stats.complianceRate}%` : "—",
			description: division
				? "Active contracts vs total"
				: "Requires division assignment",
			icon: CheckCircle2,
			href: division ? `/analytics/${division}` : "/analytics",
		},
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
			{cards.map((card) => (
				<Link key={card.title} href={card.href} className="block min-w-0">
					<Card className="glass-card interactive-glass-card h-full cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0f5384]/40">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div className="min-w-0">
									<p className="text-sm font-medium sidebar-gradient-text">
										{card.title}
									</p>
									<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
										<span>{card.value}</span>
										<span className="inline-block ml-2 pb-1">
											<card.icon className="h-8 w-8 text-slate-600" />
										</span>
									</div>
									<p className="text-xs text-slate-600 mt-1">
										{card.description}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</Link>
			))}
		</div>
	);
}
