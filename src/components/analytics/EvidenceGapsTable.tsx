"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
import type { AuditEvidenceRow } from "@/lib/audits/types";
import { cn } from "@/lib/utils";

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

const rowPad = "px-3 py-3 align-middle";

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
					<CaalmDataTable className="px-0 sm:px-0 pb-0">
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								{!compact ? (
									<TableHead
										className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-3")}
									>
										ID
									</TableHead>
								) : null}
								<TableHead
									className={cn(
										DATA_TABLE_HEADER_CELL,
										compact ? "pl-4 pr-3" : "px-3",
									)}
								>
									Item
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
								<TableHead
									className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4")}
								/>
							</TableRow>
						</TableHeader>
						<TableBody className="[&_tr:last-child>td]:border-b-0">
							{rows.slice(0, compact ? 5 : 10).map((row) => (
								<TableRow key={row.id} className={DATA_TABLE_BODY_ROW_BASE}>
									{!compact ? (
										<TableCell
											className={cn(rowPad, "pl-4 pr-3 text-xs text-slate-500")}
										>
											{row.id}
										</TableCell>
									) : null}
									<TableCell
										className={cn(
											rowPad,
											compact ? "pl-4 pr-3" : "",
											"text-sm text-slate-700 font-medium",
										)}
									>
										{row.title}
									</TableCell>
									<TableCell className={cn(rowPad, "text-sm text-slate-600")}>
										{row.owner}
									</TableCell>
									<TableCell className={rowPad}>
										<Badge
											variant="outline"
											className={
												STATUS_STYLES[row.status] ??
												"bg-slate-100 text-slate-700"
											}
										>
											{STATUS_LABELS[row.status] ?? row.status}
										</Badge>
									</TableCell>
									<TableCell className={cn(rowPad, "text-sm text-slate-600")}>
										{row.dueDate}
									</TableCell>
									<TableCell className={cn(rowPad, "pl-3 pr-4 text-right")}>
										{row.moduleLink ? (
											<Link
												href={row.moduleLink}
												className="inline-flex items-center text-xs text-[#0f5384] hover:underline cursor-pointer"
											>
												View
												<ArrowRight className="h-3 w-3 ml-1" />
											</Link>
										) : null}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</CaalmDataTable>
				)}
			</CardContent>
		</Card>
	);
}
