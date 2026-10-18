"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { type Gift as GiftRow, giftStatusBadgeClass } from "@/lib/gifts";
import { cn } from "@/lib/utils";

const rowPad = "px-3 py-3 align-middle";

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
	const [shareCampaign, setShareCampaign] = useState("");
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
		if (shareCampaign.trim()) params.set("shareCampaign", shareCampaign.trim());
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
	}, [page, debouncedSearch, status, shareCampaign]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		setPage(1);
	}, [debouncedSearch, status, shareCampaign]);

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
				<Input
					value={shareCampaign}
					onChange={(e) => setShareCampaign(e.target.value)}
					placeholder="Campaign tag"
					className="h-10 w-[180px] border-[0.25px] border-slate-300"
					aria-label="Filter by campaign tag"
				/>
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
						<CaalmDataTable className="px-0 sm:px-0 pb-0">
							<TableHeader className="[&_tr]:border-b-0">
								<TableRow className={DATA_TABLE_HEADER_ROW}>
									<TableHead
										className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-3")}
									>
										Receipt
									</TableHead>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
										Date
									</TableHead>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
										Amount
									</TableHead>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
										Status
									</TableHead>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
										Campaign tag
									</TableHead>
									<TableHead
										className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4")}
									/>
								</TableRow>
							</TableHeader>
							<TableBody className="[&_tr:last-child>td]:border-b-0">
								{items.map((gift) => (
									<TableRow
										key={gift.$id}
										className={DATA_TABLE_BODY_ROW_BASE}
									>
										<TableCell
											className={cn(rowPad, "pl-4 pr-3 tabular-nums text-slate-700")}
										>
											{gift.receiptNumber ?? "—"}
										</TableCell>
										<TableCell className={cn(rowPad, "text-slate-700")}>
											{gift.giftDate.slice(0, 10)}
										</TableCell>
										<TableCell
											className={cn(rowPad, "tabular-nums text-slate-700")}
										>
											{gift.currency}{" "}
											{gift.amount.toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</TableCell>
										<TableCell className={rowPad}>
											<span
												className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border capitalize ${giftStatusBadgeClass(gift.status)}`}
											>
												{gift.status}
											</span>
										</TableCell>
										<TableCell className={rowPad}>
											{gift.shareCampaign ? (
												<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-blue/10 text-blue border-blue/20">
													{gift.shareCampaign}
												</span>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</TableCell>
										<TableCell className={cn(rowPad, "pl-3 pr-4 text-right")}>
											<Link
												href={`/gifts/${gift.$id}`}
												className="text-[#0f5384] hover:underline"
											>
												View
											</Link>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</CaalmDataTable>
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
