"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AuditEvidenceRow } from "@/lib/audits/types";

const STATUS_LABELS: Record<string, string> = {
	compliant: "Compliant",
	at_risk: "At risk",
	non_compliant: "Non-compliant",
	pending: "Pending",
	in_progress: "In progress",
};

const STATUS_STYLES: Record<string, string> = {
	compliant: "bg-green/10 text-green border-green/20",
	at_risk: "bg-orange/10 text-orange border-orange/20",
	non_compliant: "bg-red/10 text-red border-red/20",
	pending: "bg-slate-100 text-slate-700 border-slate-200",
	in_progress: "bg-blue/10 text-blue border-blue/20",
};

interface EvidenceGapsTableProps {
	rows: AuditEvidenceRow[];
	isLoading?: boolean;
	compact?: boolean;
}

export function EvidenceGapsTable({
	rows,
	isLoading,
	compact = false,
}: EvidenceGapsTableProps) {
	if (isLoading) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="h-40 animate-pulse bg-slate-200/50 rounded-lg" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div className="mb-4">
					<h3 className="text-sm font-medium sidebar-gradient-text">
						Evidence gaps
					</h3>
					<p className="text-xs text-slate-600 mt-1">
						Items needing attention before audit review
					</p>
				</div>

				{rows.length === 0 ? (
					<p className="text-sm text-slate-600 py-6 text-center">
						No open evidence gaps. Your audit packet is current.
					</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-slate-200">
									{!compact ? (
										<th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">
											ID
										</th>
									) : null}
									<th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">
										Item
									</th>
									<th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">
										Owner
									</th>
									<th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">
										Status
									</th>
									<th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">
										Due
									</th>
									<th className="py-2 px-3" />
								</tr>
							</thead>
							<tbody>
								{rows.slice(0, compact ? 5 : 10).map((row) => (
									<tr
										key={row.id}
										className="border-b border-slate-100 hover:bg-blue/5 transition-colors duration-200"
									>
										{!compact ? (
											<td className="py-3 px-3 text-xs font-mono text-slate-500">
												{row.id}
											</td>
										) : null}
										<td className="py-3 px-3 text-sm text-slate-700 font-medium">
											{row.title}
										</td>
										<td className="py-3 px-3 text-sm text-slate-600">
											{row.owner}
										</td>
										<td className="py-3 px-3">
											<Badge
												variant="outline"
												className={
													STATUS_STYLES[row.status] ??
													"bg-slate-100 text-slate-700"
												}
											>
												{STATUS_LABELS[row.status] ?? row.status}
											</Badge>
										</td>
										<td className="py-3 px-3 text-sm text-slate-600">
											{row.dueDate}
										</td>
										<td className="py-3 px-3 text-right">
											{row.moduleLink ? (
												<Link
													href={row.moduleLink}
													className="inline-flex items-center text-xs text-[#0f5384] hover:underline cursor-pointer"
												>
													View
													<ArrowRight className="h-3 w-3 ml-1" />
												</Link>
											) : null}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
