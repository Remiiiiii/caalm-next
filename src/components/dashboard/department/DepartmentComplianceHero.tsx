"use client";

import {
	AlertTriangle,
	CheckCircle2,
	CircleAlert,
	FileText,
	ScrollText,
	Shield,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";

const RAG = {
	green: {
		label: "On track",
		icon: CheckCircle2,
		badge: "bg-green/10 text-green border-green/20",
		ring: "border-green/30",
	},
	amber: {
		label: "Needs attention",
		icon: CircleAlert,
		badge: "bg-orange/10 text-orange border-orange/20",
		ring: "border-orange/30",
	},
	red: {
		label: "At risk",
		icon: AlertTriangle,
		badge: "bg-red/10 text-red border-red/20",
		ring: "border-red/30",
	},
} as const;

interface DepartmentComplianceHeroProps {
	complianceRate: number | null;
	departmentLabel: string;
	division: string;
	areasAtRisk: number;
}

function ActionLinkButton({
	href,
	label,
	icon: Icon,
}: {
	href: string;
	label: string;
	icon: typeof FileText;
}) {
	return (
		<Link href={href} className="shrink-0">
			<Button className="primary-btn h-9 px-4! gap-2 justify-center text-xs whitespace-nowrap shadow-drop-1 border-0">
				<Icon className="h-4 w-4 shrink-0" />
				{label}
			</Button>
		</Link>
	);
}

export function DepartmentComplianceHero({
	complianceRate,
	departmentLabel,
	division,
	areasAtRisk,
}: DepartmentComplianceHeroProps) {
	const { permissions } = usePermissions();
	const score = complianceRate ?? 0;
	const ragKey =
		complianceRate === null
			? "amber"
			: score >= 80
				? "green"
				: score >= 50
					? "amber"
					: "red";
	const rag = RAG[ragKey];
	const RagIcon = rag.icon;

	const primaryLinks = [
		{ label: "Contracts", href: "/my-contracts", icon: FileText },
		permissions.includes(PERMISSIONS.LICENSES.VIEW)
			? {
					label: "Licenses",
					href: "/licenses/department",
					icon: Shield,
				}
			: {
					label: "Calendar",
					href: "/calendar",
					icon: Shield,
				},
		{ label: "Documents", href: "/uploads", icon: FileText },
	];
	const reportsLink = {
		label: "Reports",
		href: division ? `/analytics/${division}` : "/analytics",
		icon: ScrollText,
	};

	return (
		<Card className={`glass-card border-2 ${rag.ring} mb-6`}>
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_1px_minmax(0,24rem)] xl:grid-cols-[minmax(0,1.65fr)_1px_max-content] lg:grid-rows-[auto_auto] gap-x-6 gap-y-4">
					<div className="flex items-start gap-3 order-1 lg:col-start-1 lg:row-start-1 min-w-0">
						<RagIcon className="h-8 w-8 text-[#0f5384] shrink-0" />
						<p className="text-sm font-medium sidebar-gradient-text pt-1.5 flex-1 min-w-0">
							{departmentLabel || "Division"} compliance posture
						</p>
					</div>

					<div className="order-2 pl-11 -mt-1 lg:mt-0 lg:col-start-1 lg:row-start-2 lg:self-center min-w-0">
						<div className="flex flex-wrap items-center gap-3">
							<span className="text-3xl font-bold text-slate-700 shrink-0">
								{complianceRate !== null ? `${complianceRate}%` : "—"}
							</span>
							<span
								className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${rag.badge}`}
							>
								{rag.label}
							</span>
						</div>
						<p className="text-xs text-slate-600 mt-1">
							{areasAtRisk > 0
								? `${areasAtRisk} item${areasAtRisk === 1 ? "" : "s"} need attention in your division.`
								: "Division contracts look healthy right now."}
						</p>
					</div>

					<div
						aria-hidden
						className="order-3 h-px w-full bg-slate-200/80 lg:order-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:h-auto lg:w-px lg:self-stretch"
					/>

					<div
						aria-hidden
						className="hidden lg:block lg:col-start-3 lg:row-start-1 lg:row-span-2 rounded-lg bg-slate-50/50"
					/>

					<p className="order-4 lg:order-0 lg:col-start-3 lg:row-start-1 text-xs font-medium text-slate-600 pt-1.5 lg:px-5 lg:pt-3">
						Quick actions
					</p>

					<div className="order-5 lg:order-0 lg:col-start-3 lg:row-start-2 lg:self-center flex flex-wrap items-center gap-2 max-w-full lg:px-5 lg:pb-3">
						<div className="flex flex-nowrap items-center gap-2">
							{primaryLinks.map((link) => (
								<ActionLinkButton
									key={link.href + link.label}
									href={link.href}
									label={link.label}
									icon={link.icon}
								/>
							))}
						</div>
						<ActionLinkButton
							href={reportsLink.href}
							label={reportsLink.label}
							icon={reportsLink.icon}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
