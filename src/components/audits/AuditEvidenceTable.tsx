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
import {
	CaalmDataTable,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	evidenceRowKey,
	formatEvidenceDisplayId,
} from "@/lib/audits/evidence-utils";
import type { AuditEvidenceRow, AuditEvidenceStatus } from "@/lib/audits/types";
import { cn } from "@/lib/utils";

const rowPad = "px-3 py-3 align-middle";

const STATUS_BADGE_BASE =
	"h-auto rounded-full py-0.5 whitespace-nowrap shrink-0 pointer-events-none shadow-none transition-none";

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
				<CaalmDataTable className="pb-0">
					<TableHeader className="[&_tr]:border-b-0">
						<TableRow className={DATA_TABLE_HEADER_ROW}>
							<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-3")}>
								ID
							</TableHead>
							<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
								Obligation
							</TableHead>
							<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
								Owner
							</TableHead>
							<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
								Status
							</TableHead>
							<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
								Due
							</TableHead>
							<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
								Last reviewed
							</TableHead>
							<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4")}>
								CAALM module
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="[&_tr:last-child>td]:border-b-0">
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
							rows.map((row, index) => (
								<TableRow
									key={evidenceRowKey(row, index)}
									className={DATA_TABLE_BODY_ROW_BASE}
								>
									<TableCell
										className={cn(rowPad, "pl-4 pr-3 text-sm text-slate-700")}
									>
										{formatEvidenceDisplayId(row.id)}
									</TableCell>
									<TableCell
										className={cn(rowPad, "font-medium text-slate-700")}
									>
										{row.title}
										{row.category ? (
											<p className="text-xs text-slate-500 mt-0.5">
												{row.category}
											</p>
										) : null}
									</TableCell>
									<TableCell className={cn(rowPad, "text-slate-700")}>
										{row.owner}
									</TableCell>
									<TableCell className={rowPad}>
										{statusBadge(row.status)}
									</TableCell>
									<TableCell className={cn(rowPad, "text-slate-700")}>
										{format(new Date(row.dueDate), "MMM d, yyyy")}
									</TableCell>
									<TableCell className={cn(rowPad, "text-slate-600")}>
										{row.lastTested
											? format(new Date(row.lastTested), "MMM d, yyyy")
											: "—"}
									</TableCell>
									<TableCell className={cn(rowPad, "pl-3 pr-4")}>
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
				</CaalmDataTable>
			</CardContent>
		</Card>
	);
}
