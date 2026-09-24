"use client";

import {
	AlertCircle,
	CheckCircle2,
	ClipboardList,
	Clock,
	FileText,
} from "lucide-react";
import Link from "next/link";
import {
	complianceMetricTone,
	MetricStatCard,
} from "@/components/ui/metric-stat-card";
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

	const complianceTone = complianceMetricTone(stats.complianceRate);
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
			iconTone: stats.expiringSoon > 0 ? ("warning" as const) : undefined,
			dynamicIcon: stats.expiringSoon > 0 ? Clock : undefined,
			dynamicTone: "warning" as const,
			valueTone: stats.expiringSoon > 0 ? ("warning" as const) : undefined,
		},
		{
			title: "Pending approvals",
			value: stats.pendingApprovals,
			description: "Calendar and contract reviews",
			icon: ClipboardList,
			href: "/contracts/approvals",
			dynamicIcon: stats.pendingApprovals > 0 ? Clock : undefined,
			dynamicTone: "warning" as const,
		},
		{
			title: "Compliance health",
			value: stats.complianceRate !== null ? `${stats.complianceRate}%` : "—",
			description: division
				? "Active contracts vs total"
				: "Requires division assignment",
			icon: CheckCircle2,
			href: division ? `/analytics/${division}` : "/analytics",
			iconTone: complianceTone,
			dynamicIcon:
				stats.complianceRate !== null
					? complianceTone === "danger"
						? AlertCircle
						: CheckCircle2
					: undefined,
			dynamicTone: complianceTone,
			valueTone: complianceTone,
		},
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
			{cards.map((card) => (
				<Link key={card.title} href={card.href} className="block min-w-0">
					<MetricStatCard
						interactive
						title={card.title}
						value={card.value}
						description={card.description}
						icon={card.icon}
						iconTone={card.iconTone}
						dynamicIcon={card.dynamicIcon}
						dynamicTone={card.dynamicTone}
						valueTone={card.valueTone}
					/>
				</Link>
			))}
		</div>
	);
}
