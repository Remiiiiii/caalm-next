"use client";

import { Download, FileText, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn } from "@/lib/utils";

export interface InvoiceRow {
	id: string;
	number: string | null;
	status: string | null;
	amountDue: number;
	amountPaid: number;
	currency: string;
	created: number;
	hostedInvoiceUrl: string | null;
	invoicePdf: string | null;
}

interface InvoiceHistoryTableProps {
	invoices: InvoiceRow[];
	loading?: boolean;
	error?: string | null;
}

function formatMoney(cents: number, currency: string): string {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: currency.toUpperCase(),
	}).format(cents / 100);
}

export default function InvoiceHistoryTable({
	invoices,
	loading,
	error,
}: InvoiceHistoryTableProps) {
	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 space-y-4">
				<p className="text-sm font-medium sidebar-gradient-text">
					Invoice history
				</p>

				{loading && (
					<div className="flex justify-center py-8">
						<LoadingSpinner size="sm" label="Loading invoices..." />
					</div>
				)}

				{!loading && error && <p className="text-sm text-red py-4">{error}</p>}

				{!loading && !error && invoices.length === 0 && (
					<div className="flex flex-col items-center justify-center py-10 text-center gap-2">
						<Inbox className="h-8 w-8 text-slate-400" />
						<p className="text-sm text-slate-600">No invoices yet</p>
						<p className="text-xs text-slate-500">
							Invoices appear after your first successful payment.
						</p>
					</div>
				)}

				{!loading && !error && invoices.length > 0 && (
					<div className="overflow-x-auto rounded-lg border border-slate-200">
						<Table>
							<TableHeader>
								<TableRow className={DATA_TABLE_HEADER_ROW}>
									<TableHead className={DATA_TABLE_HEADER_CELL}>Date</TableHead>
									<TableHead className={DATA_TABLE_HEADER_CELL}>
										Invoice
									</TableHead>
									<TableHead className={DATA_TABLE_HEADER_CELL}>
										Amount
									</TableHead>
									<TableHead className={DATA_TABLE_HEADER_CELL}>
										Status
									</TableHead>
									<TableHead className={DATA_TABLE_HEADER_CELL}>
										Download
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{invoices.map((invoice) => (
									<TableRow
										key={invoice.id}
										className={cn(DATA_TABLE_BODY_ROW_BASE)}
									>
										<TableCell className="text-sm text-slate-700">
											{new Date(invoice.created * 1000).toLocaleDateString()}
										</TableCell>
										<TableCell className="text-sm text-slate-600">
											{invoice.number || invoice.id.slice(0, 12)}
										</TableCell>
										<TableCell className="text-sm text-slate-700">
											{formatMoney(
												invoice.amountPaid || invoice.amountDue,
												invoice.currency,
											)}
										</TableCell>
										<TableCell>
											<Badge
												variant="outline"
												className="capitalize bg-slate-50 text-slate-700 border-slate-200"
											>
												{invoice.status || "—"}
											</Badge>
										</TableCell>
										<TableCell>
											{(invoice.invoicePdf || invoice.hostedInvoiceUrl) && (
												<Button
													variant="ghost"
													size="sm"
													className="cursor-pointer h-8 px-2"
													asChild
												>
													<a
														href={
															invoice.invoicePdf ||
															invoice.hostedInvoiceUrl ||
															"#"
														}
														target="_blank"
														rel="noopener noreferrer"
													>
														<Download className="h-4 w-4" />
														<span className="sr-only">Download invoice</span>
													</a>
												</Button>
											)}
											{!invoice.invoicePdf && !invoice.hostedInvoiceUrl && (
												<FileText className="h-4 w-4 text-slate-300" />
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
