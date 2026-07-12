"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AuditKpi } from "@/lib/audits/types";

interface AuditStatCardRowProps {
	kpis: AuditKpi[];
}

export function AuditStatCardRow({ kpis }: AuditStatCardRowProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
			{kpis.map((kpi) => (
				<Card key={kpi.id} className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							{kpi.title}
						</p>
						<div className="flex items-end justify-between pt-2">
							<div>
								<div className="text-3xl font-bold text-slate-700">
									{kpi.value}
								</div>
								<p className="text-xs text-slate-600 mt-1">{kpi.description}</p>
							</div>
							{kpi.trend ? (
								<span
									className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
										kpi.trendDirection === "up"
											? "bg-green/10 text-green"
											: kpi.trendDirection === "down"
												? "bg-red/10 text-red"
												: "bg-slate-100 text-slate-600"
									}`}
								>
									{kpi.trendDirection === "up" ? (
										<TrendingUp className="h-3 w-3" />
									) : kpi.trendDirection === "down" ? (
										<TrendingDown className="h-3 w-3" />
									) : null}
									{kpi.trend}
								</span>
							) : null}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
