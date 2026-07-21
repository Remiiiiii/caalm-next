"use client";

import { format } from "date-fns";
import {
	ArrowRight,
	CheckCircle,
	Clock,
	ExternalLink,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { AuditEvidenceRow, AuditEvidenceStatus } from "@/lib/audits/types";

const STATUS_BADGE_BASE =
	"h-auto py-1 whitespace-nowrap shrink-0 pointer-events-none shadow-none transition-none";

function statusBadge(status: AuditEvidenceStatus) {
	switch (status) {
		case "compliant":
			return (
				<Badge
					className={`${STATUS_BADGE_BASE} bg-green/10 text-green border-green/20 hover:bg-green/10`}
				>
					<CheckCircle className="w-3 h-3 mr-1 shrink-0" />
					Compliant
				</Badge>
			);
		case "at_risk":
			return (
				<Badge
					className={`${STATUS_BADGE_BASE} bg-orange/10 text-orange border-orange/20 hover:bg-orange/10`}
				>
					<Clock className="w-3 h-3 mr-1 shrink-0" />
					At risk
				</Badge>
			);
		case "non_compliant":
			return (
				<Badge
					variant="destructive"
					className={`${STATUS_BADGE_BASE} bg-red/10 text-red border-red/20 hover:bg-red/10`}
				>
					<XCircle className="w-3 h-3 mr-1 shrink-0" />
					Non-compliant
				</Badge>
			);
		case "in_progress":
			return (
				<Badge
					className={`${STATUS_BADGE_BASE} min-w-[7.5rem] justify-center bg-blue/10 text-blue border-blue/20 hover:bg-blue/10`}
				>
					<Clock className="w-3 h-3 mr-1 shrink-0" />
					In progress
				</Badge>
			);
		default:
			return (
				<Badge
					variant="secondary"
					className={`${STATUS_BADGE_BASE} bg-slate-100 text-slate-700 hover:bg-slate-100`}
				>
					Pending
				</Badge>
			);
	}
}

interface AuditEvidenceTableProps {
	rows: AuditEvidenceRow[];
	logDomain: string;
	title?: string;
}

export function AuditEvidenceTable({
	rows,
	logDomain,
	title = "Compliance obligations",
}: AuditEvidenceTableProps) {
	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						{title}
					</h2>
					<Button
						variant="outline"
						className="primary-btn px-3 sm:px-4"
						asChild
					>
						<Link
							href={`/audits/audit?domain=${logDomain}&module=${logDomain}`}
						>
							View audit logs
							<ArrowRight className="h-4 w-4" />
						</Link>
					</Button>
				</div>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="border-slate-200 bg-slate-50">
								<TableHead className="font-semibold text-slate-700">
									ID
								</TableHead>
								<TableHead className="font-semibold text-slate-700">
									Obligation
								</TableHead>
								<TableHead className="font-semibold text-slate-700">
									Owner
								</TableHead>
								<TableHead className="font-semibold text-slate-700">
									Status
								</TableHead>
								<TableHead className="font-semibold text-slate-700">
									Due
								</TableHead>
								<TableHead className="font-semibold text-slate-700">
									Last reviewed
								</TableHead>
								<TableHead className="font-semibold text-slate-700">
									CAALM module
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="text-center py-8 text-slate-500"
									>
										No obligations match your search.
									</TableCell>
								</TableRow>
							) : (
								rows.map((row) => (
									<TableRow
										key={row.id}
										className="hover:bg-slate-50 transition-colors duration-200"
									>
										<TableCell className="font-mono text-sm text-slate-700">
											{row.id}
										</TableCell>
										<TableCell className="font-medium text-slate-900">
											{row.title}
											{row.category ? (
												<p className="text-xs text-slate-500 mt-0.5">
													{row.category}
												</p>
											) : null}
										</TableCell>
										<TableCell className="text-slate-700">
											{row.owner}
										</TableCell>
										<TableCell>{statusBadge(row.status)}</TableCell>
										<TableCell className="text-slate-700">
											{format(new Date(row.dueDate), "MMM d, yyyy")}
										</TableCell>
										<TableCell className="text-slate-600">
											{row.lastTested
												? format(new Date(row.lastTested), "MMM d, yyyy")
												: "—"}
										</TableCell>
										<TableCell>
											{row.moduleLink ? (
												<Link
													href={row.moduleLink}
													className="inline-flex items-center gap-1 text-sm text-[#0f5384] hover:underline cursor-pointer"
												>
													{row.moduleLabel || "Open"}
													<ExternalLink className="h-3 w-3" />
												</Link>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
