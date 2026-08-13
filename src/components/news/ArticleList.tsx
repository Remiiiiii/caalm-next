"use client";

import { format } from "date-fns";
import {
	AlertCircle,
	Ban,
	ChevronLeft,
	ChevronRight,
	Edit,
	Eye,
	EyeOff,
	Filter,
	Info,
	Loader2,
	Megaphone,
	MoreVertical,
	Newspaper,
	Search,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
					<Badge className="bg-green-100 text-green-800 border-green-200">
						Published
					</Badge>
				);
			case "draft":
				return (
					<Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
						Draft
					</Badge>
				);
			default:
				return (
					<Badge className="bg-slate-100 text-slate-800 border-slate-200">
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

	const totalPages = Math.ceil(totalItems / itemsPerPage);

	const clearFilters = () => {
		setSearchQuery("");
		setTypeFilter("all");
		setStatusFilter("all");
		setDepartmentFilter("all");
		setPriorityFilter("all");
		setCurrentPage(1);
	};

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="flex-1">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
						<Input
							placeholder="Search articles..."
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setCurrentPage(1);
							}}
							className="pl-10"
						/>
					</div>
				</div>

				<Select
					value={typeFilter}
					onValueChange={(value) => {
						setTypeFilter(value);
						setCurrentPage(1);
					}}
				>
					<SelectTrigger className="w-full sm:w-[180px]">
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
					<SelectTrigger className="w-full sm:w-[180px]">
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
					<SelectTrigger className="w-full sm:w-[180px]">
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
					variant="outline"
					onClick={clearFilters}
					className="w-full sm:w-auto"
				>
					<Filter className="mr-2 h-4 w-4" />
					Clear
				</Button>
			</div>

			{/* Bulk Actions Toolbar */}
			{selectedArticles.size > 0 && (
				<div className="flex items-center justify-between p-3 bg-blue/10 border border-blue/20 rounded-lg">
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

			{/* Table */}
			{loading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-slate-400" />
				</div>
			) : articles.length === 0 ? (
				<div className="text-center py-12">
					<Newspaper className="h-12 w-12 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600">No articles found</p>
					{searchQuery || typeFilter !== "all" || statusFilter !== "all" ? (
						<Button variant="outline" onClick={clearFilters} className="mt-4">
							Clear filters
						</Button>
					) : null}
				</div>
			) : (
				<>
					<div className="rounded-md border border-slate-200">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">
										<Checkbox
											checked={
												selectedArticles.size === articles.length &&
												articles.length > 0
											}
											onCheckedChange={handleSelectAll}
										/>
									</TableHead>
									<TableHead>Title</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Priority</TableHead>
									<TableHead>Department</TableHead>
									<TableHead>Author</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Views</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{articles.map((article) => (
									<TableRow key={article.id}>
										<TableCell>
											<Checkbox
												checked={selectedArticles.has(article.id)}
												onCheckedChange={(checked) =>
													handleSelectArticle(article.id, checked as boolean)
												}
											/>
										</TableCell>
										<TableCell className="font-medium max-w-xs truncate">
											{article.title}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												{getTypeIcon(article.type)}
												<span className="capitalize">{article.type}</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-1">
												{getStatusBadge(article.status)}
												{article.scheduledAt &&
													new Date(article.scheduledAt) > new Date() && (
														<Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
															Scheduled
														</Badge>
													)}
											</div>
										</TableCell>
										<TableCell>{getPriorityBadge(article.priority)}</TableCell>
										<TableCell>{article.department || "-"}</TableCell>
										<TableCell>{article.author}</TableCell>
										<TableCell>
											{format(new Date(article.date), "MMM dd, yyyy")}
										</TableCell>
										<TableCell>{article.viewCount || 0}</TableCell>
										<TableCell className="text-right">
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
															onClick={() => handlePublish(article.id, false)}
														>
															Unpublish
														</AppDropdownMenuItem>
													) : (
														<AppDropdownMenuItem
															icon={Eye}
															onClick={() => handlePublish(article.id, true)}
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

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between">
							<div className="text-sm text-slate-600">
								Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
								{Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
								{totalItems} articles
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
								>
									<ChevronLeft className="h-4 w-4" />
									Previous
								</Button>
								<div className="flex items-center gap-1">
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										let pageNum: number;
										if (totalPages <= 5) {
											pageNum = i + 1;
										} else if (currentPage <= 3) {
											pageNum = i + 1;
										} else if (currentPage >= totalPages - 2) {
											pageNum = totalPages - 4 + i;
										} else {
											pageNum = currentPage - 2 + i;
										}
										return (
											<Button
												key={pageNum}
												variant={currentPage === pageNum ? "default" : "ghost"}
												size="sm"
												onClick={() => setCurrentPage(pageNum)}
												className={
													currentPage === pageNum
														? "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-700"
														: ""
												}
											>
												{pageNum}
											</Button>
										);
									})}
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setCurrentPage((p) => Math.min(totalPages, p + 1))
									}
									disabled={currentPage === totalPages}
								>
									Next
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</>
			)}

			{/* Delete Confirmation Dialog */}
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
							className="bg-red text-white hover:bg-red/90"
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
		</div>
	);
};

export default ArticleList;
