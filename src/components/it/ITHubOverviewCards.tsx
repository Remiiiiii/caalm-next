"use client";

import {
	Building2,
	FileText,
	HardDrive,
	Shield,
	Ticket,
	Users,
} from "lucide-react";
import Link from "next/link";
import { SampleDataBadge } from "@/components/ui/sample-data-badge";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import { LoadingSpinner } from "@/components/ui/loading";
import { Card, CardContent } from "@/components/ui/card";
import { useITHubOverview } from "@/hooks/useITHubOverview";
import { formatStorageUsedBytes } from "@/lib/storage/formatStorageUsed";

function ratioLabel(used: number | null, limit: number): string {
	if (used == null) return "—";
	if (!Number.isFinite(limit)) return `${used.toLocaleString()} used`;
	return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
}

export function ITHubOverviewCards({ orgId }: { orgId: string }) {
	const { snapshot, isLoading, error } = useITHubOverview(orgId);

	if (isLoading) {
		return (
			<div className="flex justify-center py-8">
				<LoadingSpinner size="sm" label="Loading organization IT data…" />
			</div>
		);
	}

	if (error || !snapshot) {
		return (
			<div className="rounded-lg border border-red/20 bg-red/10 px-4 py-3 text-sm text-red">
				{error || "Unable to load organization IT data."}
			</div>
		);
	}

	const storage = formatStorageUsedBytes(snapshot.storage.usedBytes);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-sm font-medium sidebar-gradient-text">
						{snapshot.name}
					</p>
					<p className="text-xs text-slate-500 mt-1">
						{snapshot.tier} · {snapshot.status}
						{snapshot.billingStatus ? ` · billing ${snapshot.billingStatus}` : ""}
					</p>
				</div>
			</div>

			{snapshot.notices.length > 0 ? (
				<div className="space-y-2">
					{snapshot.notices.map((notice) => (
						<div
							key={notice}
							className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
						>
							<p className="text-sm text-slate-600 max-w-3xl">{notice}</p>
							<SampleDataBadge
								label={
									notice.includes("not configured")
										? "Not configured"
										: "Notice"
								}
							/>
						</div>
					))}
				</div>
			) : null}

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<MetricStatCard
					title="Staff seats"
					value={ratioLabel(snapshot.users.used, snapshot.users.limit)}
					description={
						snapshot.twoFactor
							? `${snapshot.twoFactor.enabled} of ${snapshot.twoFactor.total} with 2FA`
							: "2FA ratio not configured"
					}
					icon={Users}
				/>
				<MetricStatCard
					title="File storage"
					value={`${storage.formatted} ${storage.unit}`}
					description="Org file bytes vs plan cap"
					icon={HardDrive}
				/>
				<MetricStatCard
					title="Open tickets"
					value={snapshot.tickets.open.toLocaleString()}
					description={
						snapshot.tickets.criticalOpen > 0
							? `${snapshot.tickets.criticalOpen} critical`
							: "Active queue"
					}
					icon={Ticket}
					iconTone={snapshot.tickets.criticalOpen > 0 ? "danger" : "default"}
				/>
				<MetricStatCard
					title="Contracts / licenses"
					value={`${snapshot.contracts.used} / ${snapshot.licenses.used}`}
					description="Active contracts then licenses"
					icon={FileText}
				/>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text mb-3">
							Recent tickets
						</p>
						{snapshot.tickets.recent.length === 0 ? (
							<p className="text-sm text-slate-600">No open tickets.</p>
						) : (
							<ul className="space-y-2">
								{snapshot.tickets.recent.map((ticket) => (
									<li key={ticket.id} className="text-sm text-slate-700">
										<Link
											href={`/tickets/${ticket.id}`}
											className="hover:text-[#0f5384]"
										>
											{ticket.ticketNumber || ticket.id} · {ticket.title}
										</Link>
										<span className="text-xs text-slate-500 ml-2">
											{ticket.severity}
										</span>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text mb-3">
							Security & integrations
						</p>
						<ul className="space-y-2 text-sm text-slate-700">
							<li className="flex items-center gap-2">
								<Shield className="h-4 w-4 text-[#0f5384]" />
								HubSpot: {snapshot.integrations.hubspotStatus || "Not connected"}
							</li>
							<li className="flex items-center gap-2">
								<Building2 className="h-4 w-4 text-[#0f5384]" />
								Deletion:{" "}
								{snapshot.deletionScheduledAt
									? snapshot.deletionScheduledAt
									: "Not scheduled"}
							</li>
						</ul>
						{snapshot.audit.recent.length > 0 ? (
							<ul className="mt-4 space-y-1">
								{snapshot.audit.recent.slice(0, 5).map((entry) => (
									<li
										key={`${entry.eventTitle}-${entry.createdAt}`}
										className="text-xs text-slate-600"
									>
										{entry.eventTitle} · {entry.userName}
									</li>
								))}
							</ul>
						) : (
							<p className="mt-4 text-sm text-slate-600">
								No recent audit events.
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
