"use client";

import { Calendar, FileText, Plus, TrendingUp } from "lucide-react";
import type { Models } from "node-appwrite";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import ArticleEditor from "@/components/news/ArticleEditor";
import ArticleList from "@/components/news/ArticleList";
import NewsAnalytics from "@/components/news/NewsAnalytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface ContentCreatorDashboardProps {
	user?:
		| (Models.User<Models.Preferences> & {
				$id: string;
				accountId?: string;
				fullName?: string;
				role?: string;
				division?: string;
		  })
		| null;
}

interface NewsStats {
	total: number;
	published: number;
	drafts: number;
	thisMonth: number;
}

const ContentCreatorDashboard: React.FC<ContentCreatorDashboardProps> = ({
	user: _user,
}) => {
	const [stats, setStats] = useState<NewsStats>({
		total: 0,
		published: 0,
		drafts: 0,
		thisMonth: 0,
	});
	const [loading, setLoading] = useState(true);
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [editingArticle, setEditingArticle] = useState<string | null>(null);
	const { toast } = useToast();

	const fetchStats = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/internal-news/analytics");

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `Failed to fetch stats: ${response.statusText}`,
				);
			}

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || "Failed to load statistics");
			}

			const overview = data.analytics?.overview || {};

			setStats({
				total: overview.total || 0,
				published: overview.published || 0,
				drafts: overview.drafts || 0,
				thisMonth: overview.thisMonth || 0,
			});
		} catch (error) {
			console.error("Error fetching stats:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Failed to load statistics";

			toast({
				title: "Error loading statistics",
				description: errorMessage,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		void fetchStats();
	}, [fetchStats]);

	const handleCreateArticle = () => {
		setEditingArticle(null);
		setIsEditorOpen(true);
	};

	const handleEditArticle = (articleId: string) => {
		setEditingArticle(articleId);
		setIsEditorOpen(true);
	};

	const handleEditorClose = () => {
		setIsEditorOpen(false);
		setEditingArticle(null);
		fetchStats();
	};

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			{/* Header */}
			<div className="mb-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="h1 capitalize sidebar-gradient-text">
							Content Creator Dashboard
						</h1>
						<p className="text-sm text-slate-600 mt-1">
							Manage and create company news articles
						</p>
					</div>
					<Button onClick={handleCreateArticle} className="primary-btn">
						<Plus className="h-4 w-4" />
						Create Article
					</Button>
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium sidebar-gradient-text">
									Total Articles
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
									<span>{loading ? "..." : stats.total}</span>
									<span className="inline-block ml-2 pb-1">
										<FileText className="h-8 w-8 text-slate-600" />
									</span>
								</div>
								<p className="text-xs text-slate-600 mt-1">All articles</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium sidebar-gradient-text">
									Published
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
									<span>{loading ? "..." : stats.published}</span>
									<span className="inline-block ml-2 pb-1">
										<TrendingUp className="h-8 w-8 text-slate-600" />
									</span>
								</div>
								<p className="text-xs text-slate-600 mt-1">Live articles</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium sidebar-gradient-text">
									Drafts
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
									<span>{loading ? "..." : stats.drafts}</span>
									<span className="inline-block ml-2 pb-1">
										<FileText className="h-8 w-8 text-slate-600" />
									</span>
								</div>
								<p className="text-xs text-slate-600 mt-1">Unpublished</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium sidebar-gradient-text">
									This Month
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
									<span>{loading ? "..." : stats.thisMonth}</span>
									<span className="inline-block ml-2 pb-1">
										<Calendar className="h-8 w-8 text-slate-600" />
									</span>
								</div>
								<p className="text-xs text-slate-600 mt-1">
									Published this month
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Articles and Analytics Tabs */}
			<Tabs defaultValue="articles" className="space-y-4">
				<TabsList>
					<TabsTrigger value="articles">Articles</TabsTrigger>
					<TabsTrigger value="analytics">Analytics</TabsTrigger>
				</TabsList>

				<TabsContent value="articles">
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<ArticleList onEdit={handleEditArticle} onRefresh={fetchStats} />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="analytics">
					<NewsAnalytics />
				</TabsContent>
			</Tabs>

			{/* Article Editor Dialog */}
			{isEditorOpen && (
				<ArticleEditor
					articleId={editingArticle}
					open={isEditorOpen}
					onClose={handleEditorClose}
					onSave={handleEditorClose}
				/>
			)}
		</div>
	);
};

export default ContentCreatorDashboard;
