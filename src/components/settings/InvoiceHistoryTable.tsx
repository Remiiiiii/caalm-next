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
			<CardContent className="space-y-4 p-4 sm:p-6">
				{loading && (
					<div className="flex justify-center py-10">
						<LoadingSpinner size="sm" label="Loading invoices…" />
					</div>
				)}

				{!loading && error ? (
					<p className="py-6 text-center text-sm text-red">{error}</p>
				) : null}

				{!loading && !error && invoices.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-4 py-10 text-center">
						<div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-light-400/50">
							<Inbox className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
						</div>
						<p className="text-sm font-semibold text-slate-700">
							No invoices yet
						</p>
						<p className="mt-1 text-xs text-slate-600">
							Invoices appear here after your first successful payment.
						</p>
					</div>
				) : null}

				{!loading && !error && invoices.length > 0 ? (
					<>
						<p className="text-sm font-medium sidebar-gradient-text">
							Invoice history
						</p>
						<div className="overflow-x-auto rounded-lg border border-slate-200">
							<Table>
								<TableHeader>
									<TableRow className={DATA_TABLE_HEADER_ROW}>
										<TableHead className={DATA_TABLE_HEADER_CELL}>
											Date
										</TableHead>
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
													className="border-slate-200 bg-slate-50 capitalize text-slate-700"
												>
													{invoice.status || "—"}
												</Badge>
											</TableCell>
											<TableCell>
												{invoice.invoicePdf || invoice.hostedInvoiceUrl ? (
													<Button
														variant="ghost"
														size="sm"
														className="h-8 cursor-pointer px-2"
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
												) : (
													<FileText className="h-4 w-4 text-slate-300" />
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</>
				) : null}
			</CardContent>
		</Card>
	);
}
