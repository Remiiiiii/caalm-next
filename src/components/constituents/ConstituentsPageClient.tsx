"use client";

import { Plus, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConstituentRowMenu } from "@/components/constituents/ConstituentRowMenu";
import { CreateConstituentDialog } from "@/components/constituents/CreateConstituentDialog";
import { Button } from "@/components/ui/button";
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
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import {
	CONSTITUENT_DNC_BADGE_CLASS,
	CONSTITUENT_TYPES,
	constituentDisplayName,
	constituentTypeBadgeClass,
	constituentTypeLabel,
	type Constituent,
} from "@/lib/constituents";

const PAGE_SIZE = 20;

export function ConstituentsPageClient() {
	const { permissions } = usePermissions();
	const canManage = permissions.includes(PERMISSIONS.CONSTITUENTS.MANAGE);
	const [items, setItems] = useState<Constituent[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [type, setType] = useState<string>("all");
	const [city, setCity] = useState("");
	const [debouncedCity, setDebouncedCity] = useState("");
	const [doNotContact, setDoNotContact] = useState<string>("all");
	const [loading, setLoading] = useState(true);
	const [createOpen, setCreateOpen] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
		return () => window.clearTimeout(timer);
	}, [search]);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedCity(city), 250);
		return () => window.clearTimeout(timer);
	}, [city]);

	const load = useCallback(async () => {
		setLoading(true);
		const params = new URLSearchParams({
			page: String(page),
			pageSize: String(PAGE_SIZE),
		});
		if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
		if (type !== "all") params.set("type", type);
		if (debouncedCity.trim()) params.set("city", debouncedCity.trim());
		if (doNotContact !== "all") params.set("doNotContact", doNotContact);
		try {
			const response = await fetch(`/api/constituents?${params.toString()}`);
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
	}, [page, debouncedSearch, type, debouncedCity, doNotContact]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		setPage(1);
	}, [debouncedSearch, type, debouncedCity, doNotContact]);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">Constituents</h1>
			</div>
			{canManage ? (
				<div className="mb-6 flex items-center justify-end">
					<Button
						className="primary-btn px-3 sm:px-4"
						onClick={() => setCreateOpen(true)}
					>
						<Plus className="h-4 w-4" />
						Add
					</Button>
				</div>
			) : null}

			<Card className="glass-card mb-6">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<div className="flex items-end justify-end gap-3">
						<SearchField
							containerClassName="max-w-md w-full"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search name or email..."
							aria-label="Search constituents"
						/>
						<Select value={type} onValueChange={setType}>
							<SelectTrigger className="h-10 w-40 border-[0.25px] border-slate-300 bg-white">
								<SelectValue placeholder="Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All types</SelectItem>
								{CONSTITUENT_TYPES.map((value) => (
									<SelectItem key={value} value={value}>
										{value.charAt(0).toUpperCase() + value.slice(1)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input
							className="h-10 w-40 border-[0.25px] border-slate-300 bg-white"
							placeholder="City"
							value={city}
							onChange={(event) => setCity(event.target.value)}
							aria-label="Filter by city"
						/>
						<Select value={doNotContact} onValueChange={setDoNotContact}>
							<SelectTrigger className="h-10 w-48 border-[0.25px] border-slate-300 bg-white">
								<SelectValue placeholder="Contact status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All contact flags</SelectItem>
								<SelectItem value="true">Do not contact</SelectItem>
								<SelectItem value="false">Can contact</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{loading && items.length === 0 ? (
						<p className="text-sm text-slate-600">Loading constituents…</p>
					) : items.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Image
								src="/assets/icons/no-data.svg"
								alt=""
								width={120}
								height={120}
							/>
							<p className="mt-4 text-sm text-slate-600">
								No constituents match these filters.
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{items.map((constituent) => {
								const name = constituentDisplayName(constituent);
								return (
									<div
										key={constituent.$id}
										className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
									>
										<Link
											href={`/constituents/${constituent.$id}`}
											className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
										>
											<div className="flex items-center gap-2">
												<Users className="h-4 w-4 text-[#0f5384] shrink-0" />
												<p className="font-medium text-slate-700 truncate hover:underline">
													{name}
												</p>
												<span
													className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${constituentTypeBadgeClass(constituent.type)}`}
												>
													{constituentTypeLabel(constituent.type)}
												</span>
												{constituent.doNotContact ? (
													<span
														className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${CONSTITUENT_DNC_BADGE_CLASS}`}
													>
														Do not contact
													</span>
												) : null}
											</div>
											<p className="mt-1 text-sm text-slate-600 truncate">
												{[constituent.email, constituent.city]
													.filter(Boolean)
													.join(" · ") || "No email or city"}
											</p>
										</Link>
										<ConstituentRowMenu
											constituent={constituent}
											canManage={canManage}
											onDeleted={(id) => {
												setItems((prev) => prev.filter((row) => row.$id !== id));
												setTotal((prev) => Math.max(0, prev - 1));
											}}
										/>
									</div>
								);
							})}
						</div>
					)}

					<PageIndex
						page={page}
						totalItems={total}
						pageSize={PAGE_SIZE}
						onPageChange={setPage}
						hideWhenSinglePage
						showRange
						itemLabel="constituents"
					/>
				</CardContent>
			</Card>

			<CreateConstituentDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				onCreated={() => {
					setPage(1);
					void load();
				}}
			/>
		</div>
	);
}
