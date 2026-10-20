"use client";

import { format } from "date-fns";
import { ArrowRight, CheckCircle, Clock, XCircle } from "lucide-react";
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
import type { DepartmentContractAtRisk } from "@/lib/dashboard/department-dashboard.types";
import { cn } from "@/lib/utils";

const STATUS_BADGE_BASE =
	"h-auto rounded-full py-0.5 whitespace-nowrap shrink-0 pointer-events-none shadow-none transition-none";

const rowPad = "px-3 py-3 align-middle";

function StatusBadge({ status }: { status: string }) {
	const normalized = status.toLowerCase();
	if (normalized === "active" || normalized === "signed") {
		return (
			<Badge
				className={`${STATUS_BADGE_BASE} bg-green/10 text-green border-green/20 hover:bg-green/10`}
			>
				<CheckCircle className="w-3 h-3 mr-1 shrink-0" />
				{status}
			</Badge>
		);
	}
	if (
		normalized === "expired" ||
		normalized === "action-required" ||
		normalized.includes("risk")
	) {
		return (
			<Badge
				className={`${STATUS_BADGE_BASE} bg-red/10 text-red border-red/20 hover:bg-red/10`}
			>
				<XCircle className="w-3 h-3 mr-1 shrink-0" />
				{status}
			</Badge>
		);
	}
	return (
		<Badge
			className={`${STATUS_BADGE_BASE} min-w-[7.5rem] justify-center bg-blue/10 text-blue border-blue/20 hover:bg-blue/10`}
		>
			<Clock className="w-3 h-3 mr-1 shrink-0" />
			{status === "pending-review" ? "In progress" : status}
		</Badge>
	);
}

interface DepartmentContractsTableProps {
	contracts: DepartmentContractAtRisk[];
	isLoading?: boolean;
}

export function DepartmentContractsTable({
	contracts,
	isLoading,
}: DepartmentContractsTableProps) {
	return (
		<Card className="glass-card h-full w-full flex flex-col min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 flex flex-col flex-1 min-h-0">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 shrink-0">
					<div>
						<h2 className="text-xl font-semibold sidebar-gradient-text">
							Contracts needing attention
						</h2>
						<p className="text-xs text-slate-600 mt-1">
							Expiring soon, pending review, or action required
						</p>
					</div>
					<Button
						variant="outline"
						className="primary-btn px-3 sm:px-4"
						asChild
					>
						<Link href="/my-contracts">
							View all
							<ArrowRight className="h-4 w-4" />
						</Link>
					</Button>
				</div>

				<div className="overflow-auto flex-1 min-h-0">
					<CaalmDataTable className="pb-0">
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-3")}>
									Contract
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
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4")}>
									Action
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="[&_tr:last-child>td]:border-b-0">
							{isLoading ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="py-8 text-center text-slate-500"
									>
										Loading contracts…
									</TableCell>
								</TableRow>
							) : contracts.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="py-8 text-center text-slate-500"
									>
										No contracts need attention in your division.
									</TableCell>
								</TableRow>
							) : (
								contracts.map((contract) => (
									<TableRow
										key={contract.$id}
										className={DATA_TABLE_BODY_ROW_BASE}
									>
										<TableCell
											className={cn(
												rowPad,
												"pl-4 pr-3 font-medium text-slate-700",
											)}
										>
											{contract.contractName}
											{typeof contract.daysUntilExpiry === "number" ? (
												<p className="text-xs text-slate-500 mt-0.5">
													{contract.daysUntilExpiry < 0
														? `Expired ${Math.abs(contract.daysUntilExpiry)} days ago`
														: `${contract.daysUntilExpiry} days left`}
												</p>
											) : null}
										</TableCell>
										<TableCell className={cn(rowPad, "text-slate-700")}>
											{contract.owner || "—"}
										</TableCell>
										<TableCell className={rowPad}>
											<StatusBadge status={contract.status} />
										</TableCell>
										<TableCell
											className={cn(rowPad, "text-slate-700 whitespace-nowrap")}
										>
											{contract.contractExpiryDate
												? format(
														new Date(contract.contractExpiryDate),
														"MMM d, yyyy",
													)
												: "—"}
										</TableCell>
										<TableCell className={cn(rowPad, "pl-3 pr-4")}>
											<Button
												variant="outline"
												size="sm"
												className="primary-btn px-3"
												asChild
											>
												<Link href="/my-contracts">View</Link>
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</CaalmDataTable>
				</div>
			</CardContent>
		</Card>
	);
}
