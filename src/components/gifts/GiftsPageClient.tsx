"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { type Gift as GiftRow, giftStatusBadgeClass } from "@/lib/gifts";

const PAGE_SIZE = 20;

export function GiftsPageClient() {
	const { permissions } = usePermissions();
	const canCreate = permissions.includes(PERMISSIONS.GIFTS.CREATE);
	const [items, setItems] = useState<GiftRow[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [status, setStatus] = useState<string>("all");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
		return () => window.clearTimeout(timer);
	}, [search]);

	const load = useCallback(async () => {
		setLoading(true);
		const params = new URLSearchParams({
			page: String(page),
			pageSize: String(PAGE_SIZE),
		});
		if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
		if (status !== "all") params.set("status", status);
		try {
			const response = await fetch(`/api/gifts?${params.toString()}`);
			const data = await response.json();
			if (!response.ok) {
				setItems([]);
				setTotal(0);
				return;
			}
			setItems(data.items || []);
			setTotal(data.total || 0);
		} finally {
			setLoading(false);
		}
	}, [page, debouncedSearch, status]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		setPage(1);
	}, [debouncedSearch, status]);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">Gifts</h1>
			</div>
			{canCreate ? (
				<div className="mb-6 flex items-center justify-end">
					<Button className="primary-btn px-3 sm:px-4" asChild>
						<Link href="/gifts/new">
							<Plus className="h-4 w-4" />
							New gift
						</Link>
					</Button>
				</div>
			) : null}

			<div className="mb-6 flex flex-wrap items-center gap-3">
				<SearchField
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search receipt or id..."
					className="max-w-md"
				/>
				<Select value={status} onValueChange={setStatus}>
					<SelectTrigger className="h-10 w-[180px] border-[0.25px] border-slate-300">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All statuses</SelectItem>
						<SelectItem value="draft">Draft</SelectItem>
						<SelectItem value="posted">Posted</SelectItem>
						<SelectItem value="voided">Voided</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					{loading ? (
						<p className="text-sm text-slate-600">Loading gifts…</p>
					) : items.length === 0 ? (
						<div className="flex flex-col items-center py-12 text-center">
							<Image
								src="/assets/icons/no-data.svg"
								alt=""
								width={120}
								height={120}
							/>
							<p className="text-slate-600 mt-4">No gifts yet.</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm text-slate-700">
								<thead>
									<tr className="border-b border-slate-200 text-left">
										<th className="py-2 pr-4">Receipt</th>
										<th className="py-2 pr-4">Date</th>
										<th className="py-2 pr-4">Amount</th>
										<th className="py-2 pr-4">Status</th>
										<th className="py-2"> </th>
									</tr>
								</thead>
								<tbody>
									{items.map((gift) => (
										<tr
											key={gift.$id}
											className="border-b border-slate-100 hover:bg-blue-50 transition-all duration-200"
										>
											<td className="py-3 pr-4 tabular-nums">
												{gift.receiptNumber ?? "—"}
											</td>
											<td className="py-3 pr-4">
												{gift.giftDate.slice(0, 10)}
											</td>
											<td className="py-3 pr-4 tabular-nums">
												{gift.currency}{" "}
												{gift.amount.toLocaleString(undefined, {
													minimumFractionDigits: 2,
												})}
											</td>
											<td className="py-3 pr-4">
												<span
													className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border capitalize ${giftStatusBadgeClass(gift.status)}`}
												>
													{gift.status}
												</span>
											</td>
											<td className="py-3 text-right">
												<Link
													href={`/gifts/${gift.$id}`}
													className="text-[#0f5384] hover:underline"
												>
													View
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					<PageIndex
						className="mt-6"
						page={page}
						totalItems={total}
						pageSize={PAGE_SIZE}
						onPageChange={setPage}
						hideWhenSinglePage
						showRange
						itemLabel="gifts"
						scrollToTop
					/>
				</CardContent>
			</Card>
		</div>
	);
}
