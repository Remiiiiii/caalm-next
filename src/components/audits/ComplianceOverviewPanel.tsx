"use client";

import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	CircleAlert,
	FileText,
	ScrollText,
	Shield,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ComplianceStatusSnapshot } from "@/lib/audits/types";

const RAG_STYLES = {
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

const MODULE_LINKS = [
	{ label: "Contracts", href: "/contracts", icon: FileText },
	{ label: "Licenses", href: "/licenses", icon: Shield },
	{ label: "Documents", href: "/documents", icon: FileText },
	{ label: "Reports", href: "/analytics", icon: ScrollText },
] as const;

const PRIMARY_ACTION_LINKS = MODULE_LINKS.slice(0, 3);
const REPORTS_ACTION_LINK = MODULE_LINKS[3];

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

interface ComplianceOverviewPanelProps {
	snapshot: ComplianceStatusSnapshot | null;
	isLoading?: boolean;
}

export function ComplianceOverviewPanel({
	snapshot,
	isLoading,
}: ComplianceOverviewPanelProps) {
	if (isLoading || !snapshot) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={index} className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-3" />
							<div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	const { overview } = snapshot;
	const rag = RAG_STYLES[overview.ragStatus];
	const RagIcon = rag.icon;

	return (
		<div className="space-y-6 mb-6">
			<Card className={`glass-card border-2 ${rag.ring}`}>
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					{/* Keep posture + actions side-by-side on lg; only wrap buttons inside the actions zone */}
					<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_1px_minmax(0,24rem)] xl:grid-cols-[minmax(0,1.65fr)_1px_max-content] lg:grid-rows-[auto_auto] gap-x-6 gap-y-4">
						{/* Status header — top-aligned with Quick actions label on lg */}
						<div className="flex items-start gap-3 order-1 lg:col-start-1 lg:row-start-1 min-w-0">
							<RagIcon className="h-8 w-8 text-[#0f5384] shrink-0" />
							<p className="text-sm font-medium sidebar-gradient-text pt-1.5 flex-1 min-w-0">
								Organization compliance posture
							</p>
						</div>

						{/* Score + description — vertically centered with button row on lg */}
						<div className="order-2 pl-11 -mt-1 lg:mt-0 lg:col-start-1 lg:row-start-2 lg:self-center min-w-0">
							<div className="flex flex-wrap items-center gap-3">
								<span className="text-3xl font-bold text-slate-700 shrink-0">
									{overview.overallScore}%
								</span>
								<span
									className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${rag.badge}`}
								>
									{rag.label}
								</span>
							</div>
							<p className="text-xs text-slate-600 mt-1">
								Nonprofit compliance view across filings, contracts, licenses,
								documents, and governance.
							</p>
						</div>

						{/* Zone divider — horizontal on mobile, vertical on lg */}
						<div
							aria-hidden
							className="order-3 h-px w-full bg-slate-200/80 lg:order-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:h-auto lg:w-px lg:self-stretch"
						/>

						{/* Actions zone background (desktop) */}
						<div
							aria-hidden
							className="hidden lg:block lg:col-start-3 lg:row-start-1 lg:row-span-2 rounded-lg bg-slate-50/50"
						/>

						{/* Quick actions label — shares top line with card title */}
						<p className="order-4 lg:order-0 lg:col-start-3 lg:row-start-1 text-xs font-medium text-slate-600 pt-1.5 lg:px-5 lg:pt-3">
							Quick actions
						</p>

						{/*
						  Contracts / Licenses / Documents stay on one row (nowrap group).
						  Only Reports wraps beneath when the actions column is too narrow.
						*/}
						<div className="compliance-quick-actions order-5 lg:order-0 lg:col-start-3 lg:row-start-2 lg:self-center flex flex-wrap items-center gap-2 max-w-full lg:px-5 lg:pb-3">
							<div className="flex flex-wrap items-center gap-2">
								{PRIMARY_ACTION_LINKS.map((link) => (
									<ActionLinkButton
										key={link.href}
										href={link.href}
										label={link.label}
										icon={link.icon}
									/>
								))}
							</div>
							<ActionLinkButton
								href={REPORTS_ACTION_LINK.href}
								label={REPORTS_ACTION_LINK.label}
								icon={REPORTS_ACTION_LINK.icon}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							Areas at risk
						</p>
						<div className="text-3xl font-bold text-slate-700 pt-2">
							{overview.areasAtRisk}
						</div>
						<p className="text-xs text-slate-600 mt-1">
							Contracts, licenses, or filings needing action
						</p>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							Upcoming deadlines
						</p>
						<div className="text-3xl font-bold text-slate-700 pt-2">
							{overview.upcomingDeadlines}
						</div>
						<p className="text-xs text-slate-600 mt-1">
							Next 90 days across CAALM modules
						</p>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							Contract compliance
						</p>
						<div className="text-3xl font-bold text-slate-700 pt-2">
							{overview.contractComplianceRate !== null
								? `${overview.contractComplianceRate}%`
								: "—"}
						</div>
						<p className="text-xs text-slate-600 mt-1">
							{snapshot.sources.contracts
								? "Live from Contracts module"
								: "Requires contracts.view permission"}
						</p>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							License renewal health
						</p>
						<div className="text-3xl font-bold text-slate-700 pt-2">
							{overview.licenseRenewalHealth !== null
								? `${overview.licenseRenewalHealth}%`
								: "—"}
						</div>
						<p className="text-xs text-slate-600 mt-1">
							{snapshot.sources.licenses
								? "Live from Licenses module"
								: "Requires licenses.view permission"}
						</p>
					</CardContent>
				</Card>
			</div>

			{(snapshot.sources.contracts || snapshot.sources.licenses) && (
				<div className="flex items-start gap-2 text-xs text-slate-500">
					<ArrowRight className="h-3 w-3 shrink-0 mt-0.5" />
					<span className="min-w-0">
						Contracts and licenses tabs use live CAALM data. Regulatory,
						documents, and governance metrics use tracked obligations until
						those modules are fully connected.
					</span>
				</div>
			)}
		</div>
	);
}
