"use client";

import {
	ArrowRight,
	BadgeCheck,
	FileText,
	Scale,
	type Shield,
	Users,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AuditReadinessDomain } from "@/lib/analytics/audit-readiness.types";
import type { AuditControlDomain } from "@/lib/audits/types";
import { cn } from "@/lib/utils";

const DOMAIN_ICONS: Record<AuditControlDomain, typeof Shield> = {
	regulatory: Scale,
	contracts: FileText,
	licenses: BadgeCheck,
	documents: FileText,
	governance: Users,
};

const RAG_PROGRESS: Record<string, string> = {
	green: "[&>div]:bg-green",
	amber: "[&>div]:bg-orange",
	red: "[&>div]:bg-red",
};

interface DomainReadinessGridProps {
	domains: AuditReadinessDomain[];
	isLoading?: boolean;
}

export function DomainReadinessGrid({
	domains,
	isLoading,
}: DomainReadinessGridProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{Array.from({ length: 5 }).map((_, i) => (
					<Card key={i} className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="h-24 animate-pulse bg-slate-200/50 rounded-lg" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{domains.map((domain) => {
				const Icon = DOMAIN_ICONS[domain.domain];
				return (
					<Card
						key={domain.domain}
						className="glass-card interactive-glass-card"
					>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-start justify-between gap-3 mb-4">
								<div className="flex items-center gap-3 min-w-0">
									<div className="p-2 rounded-lg bg-blue/10 shrink-0">
										<Icon className="h-5 w-5 text-[#0f5384]" />
									</div>
									<div className="min-w-0">
										<p className="text-sm font-medium sidebar-gradient-text truncate">
											{domain.label}
										</p>
										<p className="text-xs text-slate-600">
											{domain.atRiskCount} at risk · {domain.evidenceCount}{" "}
											tracked
										</p>
									</div>
								</div>
								<p className="text-2xl font-bold text-slate-700 shrink-0">
									{domain.readinessPercent}%
								</p>
							</div>
							<Progress
								value={domain.readinessPercent}
								className={cn("h-2 mb-4", RAG_PROGRESS[domain.ragStatus])}
							/>
							<Link
								href={domain.modulePath}
								className="inline-flex items-center text-xs text-[#0f5384] hover:underline cursor-pointer"
							>
								View controls
								<ArrowRight className="h-3 w-3 ml-1" />
							</Link>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
