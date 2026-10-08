"use client";

import { format } from "date-fns";
import {
	AlertCircle,
	Calendar,
	ChevronRight,
	FileText,
	Filter,
	Info,
	LayoutGrid,
	Megaphone,
	MegaphoneOff,
	MoveRight,
	Newspaper,
	RotateCcw,
	TrendingDown,
	TrendingUp,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { NewsAckBanner } from "@/components/news/NewsAckBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatCardIcon } from "@/components/ui/stat-card-icon";

interface NewsItem {
	id: string;
	title: string;
	content: string;
	author: string;
	date: string;
	type: "announcement" | "update" | "alert" | "info";
	priority: "high" | "medium" | "low";
	department?: string;
	image?: string;
}

interface NewsResponse {
	items: NewsItem[];
	total: number;
	limit: number;
	offset: number;
	viewer?: {
		canCreate?: boolean;
		canManageFeeds?: boolean;
	};
}

interface CompanyNewsFeedProps {
	limit?: number;
	fullPage?: boolean;
	/** Parent-supplied list; skip self-fetch in widget mode when defined. */
	items?: NewsItem[];
	total?: number;
	viewer?: {
		canCreate?: boolean;
		canManageFeeds?: boolean;
	};
	parentLoading?: boolean;
}

const CompanyNewsFeed: React.FC<CompanyNewsFeedProps> = ({
	limit = 5,
	fullPage = false,
	items: propItems,
	total: propTotal,
	viewer: propViewer,
	parentLoading = false,
}) => {
	const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalItems, setTotalItems] = useState(0);
	const itemsPerPage = fullPage ? 9 : limit;

	// Filters (only for full page)
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [departmentFilter, setDepartmentFilter] = useState("all");
	const [viewer, setViewer] = useState<{
		canCreate?: boolean;
		canManageFeeds?: boolean;
	}>({});
	const [categoryCount, setCategoryCount] = useState(0);
	const [categoryNames, setCategoryNames] = useState<string[]>([]);
	const [monthCount, setMonthCount] = useState(0);
	const [previousMonthCount, setPreviousMonthCount] = useState(0);
	const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);

	const skipWidgetFetch = !fullPage && propItems !== undefined;

	const fetchNewsItems = useCallback(async () => {
		try {
			setLoading(true);

			if (fullPage) {
				const offset = (currentPage - 1) * itemsPerPage;
				const params = new URLSearchParams({
					limit: itemsPerPage.toString(),
					offset: offset.toString(),
				});

				if (searchQuery) params.append("search", searchQuery);
				if (typeFilter && typeFilter !== "all")
					params.append("type", typeFilter);
				if (departmentFilter && departmentFilter !== "all")
					params.append("department", departmentFilter);

				const listUrl = `/api/internal-news?${params}`;
				const [listResponse, analyticsResponse] = await Promise.all([
					fetch(listUrl),
					fetch("/api/internal-news/analytics"),
				]);

				if (!listResponse.ok) {
					throw new Error("Failed to fetch news items");
				}

				const data: NewsResponse = await listResponse.json();
				setNewsItems(data.items);
				setTotalItems(data.total);
				setViewer(data.viewer || {});

				if (analyticsResponse.ok) {
					const payload = await analyticsResponse.json();
					const overview = payload.analytics?.overview ?? {};
					setCategoryCount(overview.categories ?? 0);
					setCategoryNames(
						Array.isArray(overview.categoryNames) ? overview.categoryNames : [],
					);
					setMonthCount(overview.thisMonth ?? 0);
					setPreviousMonthCount(overview.previousMonth ?? 0);
					setLastPublishedAt(overview.lastPublishedAt ?? null);
				}
			} else {
				const response = await fetch(`/api/internal-news?limit=${limit}`);

				if (!response.ok) {
					throw new Error("Failed to fetch news items");
				}

				const data = await response.json();
				const items = data.items || data;
				setNewsItems(Array.isArray(items) ? items.slice(0, limit) : []);
				setTotalItems(data.total ?? (Array.isArray(items) ? items.length : 0));
				setViewer(data.viewer || {});
			}

			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load news");
			console.error("Error fetching news:", err);
		} finally {
			setLoading(false);
		}
	}, [
		fullPage,
		currentPage,
		itemsPerPage,
		searchQuery,
		typeFilter,
		departmentFilter,
		limit,
	]);

	useEffect(() => {
		if (skipWidgetFetch) return;
		void fetchNewsItems();
	}, [fetchNewsItems, skipWidgetFetch]);

	useEffect(() => {
		if (propItems === undefined) return;
		setNewsItems(propItems);
		setTotalItems(propTotal ?? propItems.length);
		if (propViewer) setViewer(propViewer);
		setLoading(false);
	}, [propItems, propTotal, propViewer]);

	const isFeedLoading = parentLoading || loading;
	const totalPages = Math.ceil(totalItems / itemsPerPage);

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	const clearFilters = () => {
		setSearchQuery("");
		setTypeFilter("all");
		setDepartmentFilter("all");
		setCurrentPage(1);
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case "announcement":
				return <Megaphone className="h-4 w-4 text-blue" />;
			case "alert":
				return <AlertCircle className="h-4 w-4 text-red" />;
			case "info":
				return <Info className="h-4 w-4 text-green" />;
			case "update":
				return <Newspaper className="h-4 w-4 text-pink" />;
			default:
				return <Newspaper className="h-4 w-4 text-light-200" />;
		}
	};

	const getTypeColor = (type: string) => {
		switch (type) {
			case "announcement":
				return "bg-blue/10 text-blue border-blue/20";
			case "alert":
				return "bg-red/10 text-red border-red/20";
			case "info":
				return "bg-green/10 text-green border-green/20";
			case "update":
				return "bg-pink/10 text-pink border-pink/20";
			default:
				return "bg-light-300 text-light-100 border-light-200";
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60 * 60),
		);

		if (diffInHours < 1) {
			return "Just now";
		} else if (diffInHours < 24) {
			return `${diffInHours}h ago`;
		} else if (diffInHours < 48) {
			return "Yesterday";
		} else {
			return fullPage
				? format(date, "MMM dd, yyyy")
				: date.toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					});
		}
	};

	const monthStartLabel = format(
		new Date(new Date().getFullYear(), new Date().getMonth(), 1),
		"MMM d",
	);
	const previousMonthLabel = format(
		new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
		"MMMM",
	);
	const lastPublishedLabel = lastPublishedAt
		? format(new Date(lastPublishedAt), "MMM d, yyyy")
		: "—";
	const visibleCategoryNames = categoryNames.slice(0, 3);
	const hiddenCategoryCount = Math.max(categoryNames.length - 3, 0);
	const monthTrendDown = monthCount < previousMonthCount;
	const monthTrendEqual = monthCount === previousMonthCount;
	const monthTrendUp = monthCount > previousMonthCount;
	const hasActiveFilters =
		Boolean(searchQuery) || typeFilter !== "all" || departmentFilter !== "all";

	// Full Page View
	if (fullPage) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<NewsAckBanner />

				{/* Page header — icon tile + title (CAALM brand, mock layout) */}
				<div className="mb-6 flex items-start gap-4">
					<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-green/15 shadow-sm">
						<FileText className="h-5 w-5 text-[#0f5384]" />
					</div>
					<div>
						<h1 className="h1 capitalize sidebar-gradient-text">
							Company News
						</h1>
						<p className="mt-1 text-sm text-slate-600">
							Stay informed with the latest company announcements and updates
						</p>
					</div>
				</div>

				{/* Stats — real facts in the footers; sparse zeros are honest empty state */}
				<div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="flex h-full flex-col p-4 sm:p-6">
							<div className="flex items-center gap-2">
								<StatCardIcon icon={FileText} />
								<p className="text-sm font-medium sidebar-gradient-text">
									Total Articles
								</p>
							</div>
							<p className="pt-2 text-3xl font-bold tabular-nums text-slate-700">
								{totalItems}
							</p>
							<p className="mt-1 text-xs text-slate-600">
								{totalItems === 0
									? "None published yet"
									: `${totalItems} published`}
							</p>
							<div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
								<span>Last published</span>
								<span className="tabular-nums text-slate-600">
									{lastPublishedLabel}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="flex h-full flex-col p-4 sm:p-6">
							<div className="flex items-center gap-2">
								<StatCardIcon
									icon={
										monthTrendDown
											? TrendingDown
											: monthTrendEqual
												? MoveRight
												: TrendingUp
									}
									tone={
										monthTrendDown
											? "danger"
											: monthTrendEqual
												? "warning"
												: monthTrendUp
													? "success"
													: "default"
									}
								/>
								<p className="text-sm font-medium sidebar-gradient-text">
									This Month
								</p>
							</div>
							<p className="pt-2 text-3xl font-bold tabular-nums text-slate-700">
								{monthCount}
							</p>
							<p className="mt-1 text-xs text-slate-600">
								New since {monthStartLabel}
							</p>
							<div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
								<span>vs. {previousMonthLabel}</span>
								<span className="tabular-nums text-slate-600">
									{previousMonthCount} article
									{previousMonthCount === 1 ? "" : "s"}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="flex h-full flex-col p-4 sm:p-6">
							<div className="flex items-center gap-2">
								<StatCardIcon icon={LayoutGrid} />
								<p className="text-sm font-medium sidebar-gradient-text">
									Categories
								</p>
							</div>
							<p className="pt-2 text-3xl font-bold tabular-nums text-slate-700">
								{categoryCount}
							</p>
							<p className="mt-1 text-xs text-slate-600">
								{categoryCount === 0 ? "None in use yet" : "Ready to use"}
							</p>
							{categoryNames.length > 0 ? (
								<div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
									{visibleCategoryNames.map((name) => (
										<span
											key={name}
											className="inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-medium text-[#0f5384]"
										>
											{name}
										</span>
									))}
									{hiddenCategoryCount > 0 ? (
										<span className="text-xs tabular-nums text-slate-500">
											+{hiddenCategoryCount} more
										</span>
									) : null}
								</div>
							) : null}
						</CardContent>
					</Card>
				</div>

				{/* Filters & Search */}
				<Card className="glass-card mb-6">
					<div className="glass-card-cap" />
					<CardContent className="space-y-4 p-4 sm:p-6">
						<div className="flex items-center gap-2">
							<Filter className="h-4 w-4 text-[#0f5384]" />
							<h2 className="text-base font-semibold sidebar-gradient-text">
								Filters & Search
							</h2>
						</div>

						<div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
							<div>
								<Label
									htmlFor="company-news-search"
									className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
								>
									Search
								</Label>
								<SearchField
									id="company-news-search"
									placeholder="Search news..."
									value={searchQuery}
									onChange={(e) => {
										setSearchQuery(e.target.value);
										setCurrentPage(1);
									}}
								/>
							</div>

							<div>
								<Label
									htmlFor="company-news-type"
									className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
								>
									Type
								</Label>
								<Select
									value={typeFilter}
									onValueChange={(value) => {
										setTypeFilter(value);
										setCurrentPage(1);
									}}
								>
									<SelectTrigger
										id="company-news-type"
										className="h-10 border-[0.25px] border-slate-300"
									>
										<SelectValue placeholder="All types" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All types</SelectItem>
										<SelectItem value="announcement">Announcements</SelectItem>
										<SelectItem value="update">Updates</SelectItem>
										<SelectItem value="alert">Alerts</SelectItem>
										<SelectItem value="info">Info</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label
									htmlFor="company-news-department"
									className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
								>
									Department
								</Label>
								<Select
									value={departmentFilter}
									onValueChange={(value) => {
										setDepartmentFilter(value);
										setCurrentPage(1);
									}}
								>
									<SelectTrigger
										id="company-news-department"
										className="h-10 border-[0.25px] border-slate-300"
									>
										<SelectValue placeholder="All departments" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All departments</SelectItem>
										<SelectItem value="HR">HR</SelectItem>
										<SelectItem value="IT">IT</SelectItem>
										<SelectItem value="Administration">
											Administration
										</SelectItem>
										<SelectItem value="Finance">Finance</SelectItem>
										<SelectItem value="Facilities">Facilities</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex justify-end">
								<Button
									type="button"
									onClick={clearFilters}
									className="btn-primary h-10 px-3 sm:px-4"
								>
									<X className="h-4 w-4" />
									Clear Filters
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Loading State */}
				{loading && (
					<div className="flex items-center justify-center py-12">
						<div className="flex flex-col items-center gap-3">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0f5384]" />
							<p className="text-sm font-medium text-slate-600">
								Loading news...
							</p>
						</div>
					</div>
				)}

				{/* Error State */}
				{error && !loading && (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-8 text-center">
							<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red/10">
								<AlertCircle className="h-7 w-7 text-red" />
							</div>
							<h3 className="mb-2 text-lg font-semibold text-slate-700">
								Error loading news
							</h3>
							<p className="text-sm text-slate-600">{error}</p>
							<div className="mt-4 flex justify-center">
								<Button
									onClick={fetchNewsItems}
									className="btn-primary px-3 sm:px-4"
								>
									<RotateCcw className="h-4 w-4" />
									Try Again
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Empty state */}
				{!loading && !error && newsItems.length === 0 && (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="px-6 py-16 text-center sm:px-12">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green/15">
								<FileText className="h-8 w-8 text-[#0f5384]" />
							</div>
							<h3 className="mb-2 text-lg font-semibold text-slate-700">
								{hasActiveFilters
									? "No matching articles"
									: "No articles published yet"}
							</h3>
							<p className="mx-auto max-w-md text-sm text-slate-600">
								{hasActiveFilters
									? "No news articles match your current filters. Clear filters to see all published announcements."
									: "Published announcements will appear here once your organization's content team posts one."}
							</p>
						</CardContent>
					</Card>
				)}

				{!loading && !error && newsItems.length > 0 && (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
							{newsItems.map((item) => (
								<div key={item.id} className="group cursor-pointer">
									<Card className="glass-card hover:shadow-drop-3 transition-all duration-300 overflow-hidden mb-4">
										<div className="glass-card-cap z-10" />

										{/* Featured Image */}
										<div className="relative w-full h-full mt-4 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
											{item.image ? (
												<img
													src={item.image}
													alt={item.title}
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<Newspaper className="w-16 h-16 text-light-300" />
												</div>
											)}

											{/* Type Badge Overlay */}
											<div className="absolute top-6 left-3">
												<Badge
													variant="outline"
													className={`text-xs px-3 py-1 backdrop-blur-xl bg-white/90 border-white/40 shadow-lg ${getTypeColor(
														item.type,
													)}`}
												>
													<span className="flex items-center gap-1">
														{getTypeIcon(item.type)}
														{item.type}
													</span>
												</Badge>
											</div>

											{/* Department Badge */}
											{item.department && (
												<div className="absolute top-6 right-3">
													<Badge className="text-xs px-3 py-1 backdrop-blur-md bg-dark-200/80 text-white border-dark-100/40 shadow-lg">
														{item.department}
													</Badge>
												</div>
											)}
										</div>
									</Card>

									{/* Content Below Card */}
									<div className="space-y-3">
										{/* Title */}
										<h3 className="text-lg font-semibold sidebar-gradient-text line-clamp-2 group-hover:text-blue-600 transition-colors">
											{item.title}
										</h3>

										{/* Content Preview */}
										<p className="text-sm text-light-100 line-clamp-3">
											{item.content}
										</p>

										{/* Metadata Footer */}
										<div className="flex items-center justify-between pt-2 border-t border-slate-200">
											<div className="flex items-center gap-2 text-xs text-slate-500">
												<User className="h-3.5 w-3.5" />
												<span className="font-medium">{item.author}</span>
											</div>
											<div className="flex items-center gap-2 text-xs text-light-200">
												<Calendar className="h-3.5 w-3.5" />
												<span>{formatDate(item.date)}</span>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>

						{totalPages > 1 && (
							<Card className="glass-card">
								<div className="glass-card-cap" />
								<CardContent className="p-6">
									<PageIndex
										page={currentPage}
										totalItems={totalItems}
										pageSize={itemsPerPage}
										onPageChange={handlePageChange}
										hideWhenSinglePage
										showRange
										itemLabel="articles"
										aria-label="News feed pagination"
									/>
								</CardContent>
							</Card>
						)}
					</>
				)}
			</div>
		);
	}

	// Widget View
	if (isFeedLoading) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-2 px-4">
					<CardTitle className="text-sm font-semibold sidebar-gradient-text">
						Company News
					</CardTitle>
				</CardHeader>
				<CardContent className="px-4 pb-4">
					<div className="flex items-center justify-center h-32">
						<div className="flex flex-col items-center gap-3">
							<div className="animate-spin rounded-full h-6 w-6 border-2 border-light-300 border-t-navy"></div>
							<p className="text-xs text-light-200 font-medium">
								Loading news...
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!isFeedLoading && !error && newsItems.length === 0) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-2 px-4">
					<CardTitle className="text-sm font-semibold sidebar-gradient-text">
						Company News
					</CardTitle>
				</CardHeader>
				<CardContent className="px-4 pb-4">
					<div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
						<div className="text-center py-8">
							<MegaphoneOff className="h-8 w-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm font-medium text-navy">No announcements</p>
							{viewer.canCreate || viewer.canManageFeeds ? (
								<Link
									href={
										viewer.canManageFeeds
											? "/dashboard/content-creator?tab=sources"
											: "/dashboard/content-creator"
									}
									className="text-xs text-[#0f5384]"
								>
									{viewer.canManageFeeds
										? "Connect a source"
										: "Publish your first announcement"}
								</Link>
							) : (
								<p className="text-xs text-slate-500">
									Nothing has been published yet
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error && newsItems.length === 0) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-2 px-4">
					<CardTitle className="text-sm font-semibold sidebar-gradient-text">
						Company News
					</CardTitle>
				</CardHeader>
				<CardContent className="px-4 pb-4">
					<div className="flex flex-col items-center justify-center h-32 gap-3">
						<div className="w-10 h-10 bg-red/10 rounded-full flex items-center justify-center">
							<Newspaper className="h-5 w-5 text-red" />
						</div>
						<div className="text-center">
							<p className="text-sm font-medium text-navy">News Unavailable</p>
							<p className="text-xs text-light-200">Check your connection</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="glass-card flex h-[200px] w-full flex-col overflow-hidden sm:h-[250px] lg:h-[300px]">
			<div className="glass-card-cap" />
			{/* Header */}
			<CardHeader className="pb-3 pt-2 px-4">
				<div className="flex items-center gap-2">
					<Newspaper className="h-4 w-4 text-slate-600" />
					<CardTitle className="text-sm font-semibold sidebar-gradient-text">
						Company News
					</CardTitle>
				</div>
			</CardHeader>

			<CardContent className="px-4 pb-2">
				<div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
					{newsItems.map((item, index) => (
						<div key={item.id}>
							<div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm border border-white/20 hover:bg-white/30 transition-colors duration-200">
								<div className="flex items-start gap-2">
									{/* Type icon and badge */}
									<div className="flex items-center gap-1 mb-1">
										{getTypeIcon(item.type)}
										<Badge
											variant="outline"
											className={`text-xs px-1.5 py-0.5 ${getTypeColor(
												item.type,
											)}`}
										>
											{item.type}
										</Badge>
									</div>
								</div>

								<h4 className="text-sm font-semibold text-navy mb-1 line-clamp-1">
									{item.title}
								</h4>

								<p className="text-xs text-slate-600 mb-2 line-clamp-2">
									{item.content}
								</p>

								<div className="flex items-center gap-1 text-xs text-light-200">
									<User className="h-3 w-3" />
									<span>{item.author}</span>
								</div>
							</div>

							{/* Dividing line between news items */}
							{index < 1 && <div className="h-px bg-slate-300/50 my-2"></div>}
						</div>
					))}
				</div>

				{/* Footer with view all link */}
				<div className="mt-3 border-t border-white/20 pt-3">
					<div className="flex items-center justify-center">
						<Link
							href="/company-news"
							className="flex items-center gap-1 text-xs text-light-100 hover:text-navy transition-colors duration-200"
						>
							<span>View All News</span>
							<ChevronRight className="h-3 w-3" />
						</Link>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default CompanyNewsFeed;
