"use client";

import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Inbox } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
	orgId?: string;
	loading?: boolean;
	error?: string | null;
}

const INVOICES_PER_PAGE = 5;

const paginationControlClassName =
	"inline-flex items-center gap-1 bg-transparent p-0 text-xs font-medium text-slate-700 shadow-none border-0 rounded-none cursor-pointer transition-colors duration-200 hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:text-slate-400";

function formatMoney(cents: number, currency: string): string {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: currency.toUpperCase(),
	}).format(cents / 100);
}

function invoiceStatusBadge(status: string | null): {
	label: string;
	className: string;
} {
	switch (status) {
		case "paid":
			return {
				label: "Succeeded",
				className: "bg-green/10 text-green border-green/20",
			};
		case "open":
			return {
				label: "Open",
				className: "bg-orange/10 text-orange border-orange/20",
			};
		case "draft":
			return {
				label: "Draft",
				className: "bg-slate-100 text-slate-600 border-slate-200",
			};
		case "void":
			return {
				label: "Void",
				className: "bg-slate-100 text-slate-500 border-slate-200",
			};
		case "uncollectible":
			return {
				label: "Uncollectible",
				className: "bg-red/10 text-red border-red/20",
			};
		default:
			return {
				label: status || "—",
				className: "bg-slate-50 text-slate-600 border-slate-200 capitalize",
			};
	}
}

function invoiceViewPdfUrl(invoice: InvoiceRow, orgId?: string): string | null {
	if (!invoice.invoicePdf || !orgId) return null;
	return `/api/billing/invoices/${encodeURIComponent(invoice.id)}/view?orgId=${encodeURIComponent(orgId)}`;
}

async function downloadInvoicePdf(invoice: InvoiceRow, orgId?: string) {
	if (!orgId) return;

	const response = await fetch(
		`/api/billing/invoices/${encodeURIComponent(invoice.id)}/download`,
		{
			headers: { "x-org-id": orgId },
		},
	);

	if (!response.ok) {
		throw new Error("Failed to download invoice");
	}

	const blob = await response.blob();
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download =
		response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
		`invoice-${invoice.number || invoice.id}.pdf`;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export default function InvoiceHistoryTable({
	invoices,
	orgId,
	loading,
	error,
}: InvoiceHistoryTableProps) {
	const [page, setPage] = useState(1);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);

	useEffect(() => {
		setPage(1);
	}, [invoices.length]);

	const totalPages = Math.max(1, Math.ceil(invoices.length / INVOICES_PER_PAGE));
	const safePage = Math.min(page, totalPages);

	const pagedInvoices = useMemo(() => {
		const start = (safePage - 1) * INVOICES_PER_PAGE;
		return invoices.slice(start, start + INVOICES_PER_PAGE);
	}, [invoices, safePage]);

	const atStart = safePage <= 1;
	const atEnd = safePage >= totalPages;

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

				{!loading && !error ? (
					<>
						<p className="text-sm font-medium sidebar-gradient-text">
							Invoice history
						</p>
						{invoices.length === 0 ? (
							<div className="flex flex-col items-center justify-center px-4 py-10 text-center">
								<div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-light-400/50">
									<Inbox
										className="h-4 w-4 text-slate-500"
										strokeWidth={1.75}
									/>
								</div>
								<p className="text-sm font-semibold text-slate-700">
									No invoices yet
								</p>
								<p className="mt-1 text-xs text-slate-600">
									Invoices appear here after your first successful payment.
								</p>
							</div>
						) : (
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
												View
											</TableHead>
											<TableHead className={DATA_TABLE_HEADER_CELL}>
												Download
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{pagedInvoices.map((invoice) => {
											const statusBadge = invoiceStatusBadge(invoice.status);
											const viewPdfUrl = invoiceViewPdfUrl(invoice, orgId);
											const canDownload = Boolean(invoice.invoicePdf && orgId);

											return (
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
														<span
															className={cn(
																"inline-flex items-center rounded-xl border px-2 py-0.5 text-xs font-medium",
																statusBadge.className,
															)}
														>
															{statusBadge.label}
														</span>
													</TableCell>
													<TableCell>
														{viewPdfUrl ? (
															<Button
																variant="ghost"
																size="sm"
																className="h-8 cursor-pointer px-2"
																asChild
															>
																<a
																	href={viewPdfUrl}
																	target="_blank"
																	rel="noopener noreferrer"
																>
																	<ExternalLink className="h-4 w-4" />
																	<span className="sr-only">View invoice PDF</span>
																</a>
															</Button>
														) : (
															<FileText className="h-4 w-4 text-slate-300" />
														)}
													</TableCell>
													<TableCell>
														{canDownload ? (
															<Button
																variant="ghost"
																size="sm"
																className="h-8 cursor-pointer px-2"
																disabled={downloadingId === invoice.id}
																onClick={async () => {
																	setDownloadingId(invoice.id);
																	try {
																		await downloadInvoicePdf(invoice, orgId);
																	} finally {
																		setDownloadingId(null);
																	}
																}}
															>
																<Download className="h-4 w-4" />
																<span className="sr-only">Download invoice</span>
															</Button>
														) : (
															<FileText className="h-4 w-4 text-slate-300" />
														)}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
								<div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
									<span>Total results: {invoices.length}</span>
									<div className="flex items-center gap-4">
										<button
											type="button"
											className={paginationControlClassName}
											disabled={atStart}
											onClick={() => setPage((current) => Math.max(1, current - 1))}
										>
											<ChevronLeft className="h-4 w-4" />
											Prev
										</button>
										<button
											type="button"
											className={paginationControlClassName}
											disabled={atEnd}
											onClick={() =>
												setPage((current) => Math.min(totalPages, current + 1))
											}
										>
											Next
											<ChevronRight className="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						)}
					</>
				) : null}
			</CardContent>
		</Card>
	);
}
