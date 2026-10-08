"use client";

import { format } from "date-fns";
import {
	AlertCircle,
	Ban,
	Edit,
	Eye,
	EyeOff,
	Filter,
	FunnelX,
	Info,
	Loader2,
	Megaphone,
	MoreVertical,
	Newspaper,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useNewsArticles } from "@/hooks/useNewsArticles";
import {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn } from "@/lib/utils";

interface NewsArticle {
	id: string;
	title: string;
	content: string;
	author: string;
	date: string;
	type: "announcement" | "update" | "alert" | "info";
	priority: "high" | "medium" | "low";
	department?: string;
	image?: string;
	status?: "draft" | "published" | "archived";
	viewCount?: number;
	scheduledAt?: string;
}

interface ArticleListProps {
	onEdit?: (articleId: string) => void;
	onRefresh?: () => void;
}

const ArticleList: React.FC<ArticleListProps> = ({ onEdit, onRefresh }) => {
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 20;

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [departmentFilter, setDepartmentFilter] = useState("all");
	const [priorityFilter, setPriorityFilter] = useState("all");

	// Selection
	const [selectedArticles, setSelectedArticles] = useState<Set<string>>(
		new Set(),
	);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	const { toast } = useToast();

	// Use SWR hook for data fetching with caching
	const offset = (currentPage - 1) * itemsPerPage;
	const {
		articles,
		total: totalItems,
		isLoading: loading,
		refresh: refreshArticles,
	} = useNewsArticles({
		limit: itemsPerPage,
		offset,
		type: typeFilter !== "all" ? typeFilter : undefined,
		priority: priorityFilter !== "all" ? priorityFilter : undefined,
		department: departmentFilter !== "all" ? departmentFilter : undefined,
		status: statusFilter !== "all" ? statusFilter : "all",
		search: searchQuery || undefined,
	});

	const fetchArticles = () => {
		refreshArticles();
	};

	const handleBulkDelete = async () => {
		if (selectedArticles.size === 0) return;

		const articleIds = Array.from(selectedArticles);
		setDeleting(true);
		try {
			const response = await fetch("/api/internal-news/bulk", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					articleIds,
					action: "delete",
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete articles");
			}

			const result = await response.json();
			toast({
				title: "Success",
				description: `Deleted ${result.summary.successful} of ${result.summary.total} articles`,
			});

			setSelectedArticles(new Set());
			fetchArticles();
			onRefresh?.();
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to delete articles",
				variant: "destructive",
			});
		} finally {
			setDeleting(false);
		}
	};

	const handleBulkPublish = async (publish: boolean) => {
		if (selectedArticles.size === 0) return;

		const articleIds = Array.from(selectedArticles);
		try {
			const response = await fetch("/api/internal-news/bulk", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					articleIds,
					action: publish ? "publish" : "unpublish",
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to update articles");
			}

			const result = await response.json();
			toast({
				title: "Success",
				description: `${publish ? "Published" : "Unpublished"} ${
					result.summary.successful
				} of ${result.summary.total} articles`,
			});

			setSelectedArticles(new Set());
			fetchArticles();
			onRefresh?.();
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to update articles",
				variant: "destructive",
			});
		}
	};

	const handleDelete = async (articleId: string) => {
		setDeleting(true);
		try {
			const response = await fetch(`/api/internal-news/${articleId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete article");
			}

			toast({
				title: "Success",
				description: "Article deleted successfully",
			});

			setDeleteDialogOpen(false);
			setArticleToDelete(null);
			setSelectedArticles(new Set());
			fetchArticles();
			onRefresh?.();
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to delete article",
				variant: "destructive",
			});
		} finally {
			setDeleting(false);
		}
	};

	const handlePublish = async (articleId: string, publish: boolean) => {
		try {
			const response = await fetch(`/api/internal-news/${articleId}/publish`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ publish }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to update publish status");
			}

			toast({
				title: "Success",
				description: publish ? "Article published" : "Article unpublished",
			});

			fetchArticles();
			onRefresh?.();
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to update article",
				variant: "destructive",
			});
		}
	};

	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedArticles(new Set(articles.map((a) => a.id)));
		} else {
			setSelectedArticles(new Set());
		}
	};

	const handleSelectArticle = (articleId: string, checked: boolean) => {
		const newSelected = new Set(selectedArticles);
		if (checked) {
			newSelected.add(articleId);
		} else {
			newSelected.delete(articleId);
		}
		setSelectedArticles(newSelected);
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
				return <Newspaper className="h-4 w-4 text-slate-400" />;
		}
	};

	const getStatusBadge = (status?: string) => {
		const statusValue = status || "draft";
		switch (statusValue) {
			case "published":
				return (
					<Badge className="flex items-center justify-center bg-green-100 text-green-800 border-green-200">
						Published
					</Badge>
				);
			case "draft":
				return (
					<Badge className="flex items-center justify-center bg-yellow-100 text-yellow-800 border-yellow-200">
						Draft
					</Badge>
				);
			default:
				return (
					<Badge className="flex items-center justify-center bg-slate-100 text-slate-800 border-slate-200">
						{statusValue}
					</Badge>
				);
		}
	};

	const getPriorityBadge = (priority: string) => {
		switch (priority) {
			case "high":
				return <Badge className="bg-red/10 text-red border-red/20">High</Badge>;
			case "medium":
				return (
					<Badge className="bg-yellow/10 text-yellow border-yellow/20">
						Medium
					</Badge>
				);
			case "low":
				return (
					<Badge className="bg-green/10 text-green border-green/20">Low</Badge>
				);
			default:
				return null;
		}
	};

	const clearFilters = () => {
		setSearchQuery("");
		setTypeFilter("all");
		setStatusFilter("all");
		setDepartmentFilter("all");
		setPriorityFilter("all");
		setCurrentPage(1);
	};

	return (
		<>
			<GlassCard className="glass-card mb-6">
				<div className="glass-card-cap" />
				<CardContent className="p-0">
					{/* Filters — same strip layout as contracts/licenses control bars */}
					<div className="flex flex-col sm:flex-row gap-3 pt-4 pb-3 px-4 sm:px-6">
						<div className="flex-1">
							<SearchField
								placeholder="Search articles..."
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setCurrentPage(1);
								}}
							/>
						</div>

						<Select
							value={typeFilter}
							onValueChange={(value) => {
								setTypeFilter(value);
								setCurrentPage(1);
							}}
						>
							<SelectTrigger className="w-full sm:w-[180px] border-[0.25px] border-slate-300">
								<SelectValue placeholder="Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								<SelectItem value="announcement">Announcement</SelectItem>
								<SelectItem value="update">Update</SelectItem>
								<SelectItem value="alert">Alert</SelectItem>
								<SelectItem value="info">Info</SelectItem>
							</SelectContent>
						</Select>

						<Select
							value={statusFilter}
							onValueChange={(value) => {
								setStatusFilter(value);
								setCurrentPage(1);
							}}
						>
							<SelectTrigger className="w-full sm:w-[180px] border-[0.25px] border-slate-300">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="published">Published</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="archived">Archived</SelectItem>
							</SelectContent>
						</Select>

						<Select
							value={priorityFilter}
							onValueChange={(value) => {
								setPriorityFilter(value);
								setCurrentPage(1);
							}}
						>
							<SelectTrigger className="w-full sm:w-[180px] border-[0.25px] border-slate-300">
								<SelectValue placeholder="Priority" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Priorities</SelectItem>
								<SelectItem value="high">High</SelectItem>
								<SelectItem value="medium">Medium</SelectItem>
								<SelectItem value="low">Low</SelectItem>
							</SelectContent>
						</Select>

						<Button
							onClick={clearFilters}
							className="btn-primary px-3 sm:px-4 w-full sm:w-auto"
						>
							<FunnelX className="h-4 w-4" />
							Clear
						</Button>
					</div>

					{selectedArticles.size > 0 && (
						<div className="mx-4 sm:mx-6 mb-3 flex items-center justify-between p-3 bg-blue/10 border border-blue/20 rounded-lg">
							<span className="text-sm text-slate-700">
								{selectedArticles.size} article
								{selectedArticles.size !== 1 ? "s" : ""} selected
							</span>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleBulkPublish(true)}
								>
									<Eye className="mr-2 h-4 w-4" />
									Publish
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleBulkPublish(false)}
								>
									<EyeOff className="mr-2 h-4 w-4" />
									Unpublish
								</Button>
								<Button variant="outline" size="sm" onClick={handleBulkDelete}>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete
								</Button>
							</div>
						</div>
					)}

					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-slate-400" />
						</div>
					) : articles.length === 0 ? (
						<div className="flex flex-col items-center justify-center text-center py-12 px-4">
							<Newspaper className="h-12 w-12 text-slate-400 mx-auto mb-4" />
							<p className="body-1 text-slate-700">No articles found</p>
							{searchQuery ||
							typeFilter !== "all" ||
							statusFilter !== "all" ||
							priorityFilter !== "all" ? (
								<Button
									onClick={clearFilters}
									className="btn-primary px-3 sm:px-4 mt-4"
								>
									<Filter className="h-4 w-4" />
									Clear filters
								</Button>
							) : null}
						</div>
					) : (
						<>
							<div className="w-full overflow-x-auto px-2 sm:px-4 pb-4">
								<Table className="border-separate border-spacing-0">
									<TableHeader className="[&_tr]:border-b-0">
										<TableRow className={DATA_TABLE_HEADER_ROW}>
											<TableHead
												className={`${DATA_TABLE_HEADER_CELL} pl-4 pr-2 w-10`}
											>
												<Checkbox
													checked={
														selectedArticles.size === articles.length &&
														articles.length > 0
													}
													onCheckedChange={handleSelectAll}
												/>
											</TableHead>
											<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
												Title
											</TableHead>
											<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
												Type
											</TableHead>
											<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
												Status
											</TableHead>
											<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
												Priority
											</TableHead>
											<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
												Department
											</TableHead>
											<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
												Author
											</TableHead>
											<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
												Date
											</TableHead>
											<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
												Views
											</TableHead>
											<TableHead
												className={`${DATA_TABLE_HEADER_CELL} pl-3 pr-4 text-right`}
											>
												Actions
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody className="[&_tr:last-child>td]:border-b-0">
										{articles.map((article) => (
											<TableRow
												key={article.id}
												className={cn(DATA_TABLE_BODY_ROW_BASE)}
											>
												<TableCell className="py-4 pl-4 pr-2">
													<Checkbox
														checked={selectedArticles.has(article.id)}
														onCheckedChange={(checked) =>
															handleSelectArticle(
																article.id,
																checked as boolean,
															)
														}
													/>
												</TableCell>
												<TableCell className="py-4 font-medium max-w-xs truncate text-slate-700">
													{article.title}
												</TableCell>
												<TableCell className="py-4">
													<div className="flex items-center gap-2">
														{getTypeIcon(article.type)}
														<span className="capitalize text-slate-700">
															{article.type}
														</span>
													</div>
												</TableCell>
												<TableCell className="py-4">
													<div className="flex flex-col gap-1">
														{getStatusBadge(article.status)}
														{article.scheduledAt &&
															new Date(article.scheduledAt) > new Date() && (
																<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-blue/10 text-blue border-blue/20">
																	Scheduled
																</span>
															)}
													</div>
												</TableCell>
												<TableCell className="py-4">
													{getPriorityBadge(article.priority)}
												</TableCell>
												<TableCell className="py-4 text-slate-700">
													{article.department || "-"}
												</TableCell>
												<TableCell className="py-4 text-slate-700">
													{article.author}
												</TableCell>
												<TableCell className="py-4 text-slate-700">
													{format(new Date(article.date), "MMM dd, yyyy")}
												</TableCell>
												<TableCell className="py-4 text-slate-700">
													{article.viewCount || 0}
												</TableCell>
												<TableCell className="py-4 pl-3 pr-4 text-right">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="rounded-full transition-colors hover:bg-white/30"
															>
																<MoreVertical className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<AppDropdownMenuContent align="end">
															<AppDropdownMenuItem
																icon={Edit}
																onClick={() => onEdit?.(article.id)}
															>
																Edit
															</AppDropdownMenuItem>
															{article.status === "published" ? (
																<AppDropdownMenuItem
																	icon={EyeOff}
																	onClick={() =>
																		handlePublish(article.id, false)
																	}
																>
																	Unpublish
																</AppDropdownMenuItem>
															) : (
																<AppDropdownMenuItem
																	icon={Eye}
																	onClick={() =>
																		handlePublish(article.id, true)
																	}
																>
																	Publish
																</AppDropdownMenuItem>
															)}
															<AppDropdownMenuItem
																icon={Trash2}
																tone="danger"
																onClick={() => {
																	setArticleToDelete(article.id);
																	setDeleteDialogOpen(true);
																}}
															>
																Delete
															</AppDropdownMenuItem>
														</AppDropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							<PageIndex
								className="mt-6"
								page={currentPage}
								totalItems={totalItems}
								pageSize={itemsPerPage}
								onPageChange={setCurrentPage}
								hideWhenSinglePage
								showRange
								itemLabel="articles"
								aria-label="Article list pagination"
							/>
						</>
					)}
				</CardContent>
			</GlassCard>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Article</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this article? This action cannot
							be undone.
							{selectedArticles.size > 1 &&
								` This will delete ${selectedArticles.size} articles.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>
							<Ban className="w-4 h-4" />
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (articleToDelete) {
									handleDelete(articleToDelete);
									// If multiple selected, delete all
									if (selectedArticles.size > 1) {
										selectedArticles.forEach((id) => {
											if (id !== articleToDelete) {
												handleDelete(id);
											}
										});
									}
								}
							}}
							disabled={deleting}
							className="delete-btn px-3 sm:px-4"
						>
							{deleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default ArticleList;
