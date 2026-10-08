"use client";

import { Calendar, FilePen, FileText, Plus, TrendingUp } from "lucide-react";
import type { Models } from "node-appwrite";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import ArticleEditor from "@/components/news/ArticleEditor";
import ArticleList from "@/components/news/ArticleList";
import { ConnectedSourcesPanel } from "@/components/news/ConnectedSourcesPanel";
import NewsAnalytics from "@/components/news/NewsAnalytics";
import { NewsReviewQueue } from "@/components/news/NewsReviewQueue";
import { Button } from "@/components/ui/button";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNewsAnalytics } from "@/hooks/useNewsAnalytics";

interface ContentCreatorDashboardProps {
	user?:
		| (Models.User<Models.Preferences> & {
				$id: string;
				accountId?: string;
				fullName?: string;
				role?: string;
				division?: string;
				department?: string;
				departmentLabel?: string;
		  })
		| null;
}

const NEWS_TABS = ["articles", "queue", "sources", "analytics"] as const;
type NewsTab = (typeof NEWS_TABS)[number];

function isNewsTab(value: string | null): value is NewsTab {
	return NEWS_TABS.some((tab) => tab === value);
}

/** Update ?tab= without a Next navigation (avoids proxy.ts on every click). */
function syncTabInUrl(next: NewsTab) {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	if (next === "articles") url.searchParams.delete("tab");
	else url.searchParams.set("tab", next);
	window.history.replaceState({}, "", url.toString());
}

const ContentCreatorDashboard: React.FC<ContentCreatorDashboardProps> = ({
	user,
}) => {
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [editingArticle, setEditingArticle] = useState<string | null>(null);
	const searchParams = useSearchParams();
	const [tab, setTabState] = useState<NewsTab>(() => {
		const tabParam = searchParams.get("tab");
		return isNewsTab(tabParam) ? tabParam : "articles";
	});
	const { analytics, isLoading: statsLoading, refresh: refreshStats } =
		useNewsAnalytics();
	const stats = {
		total: analytics?.overview?.total || 0,
		published: analytics?.overview?.published || 0,
		drafts: analytics?.overview?.drafts || 0,
		thisMonth: analytics?.overview?.thisMonth || 0,
	};

	const setTab = (next: string) => {
		if (!isNewsTab(next) || next === tab) return;
		setTabState(next);
		syncTabInUrl(next);
	};

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
		void refreshStats();
	};

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<DashboardGreeting
				user={user}
				actions={
					<Button onClick={handleCreateArticle} className="primary-btn">
						<Plus className="h-4 w-4" />
						Create Article
					</Button>
				}
			/>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
				<MetricStatCard
					title="Total Articles"
					value={statsLoading ? "..." : stats.total}
					description="All articles"
					icon={FileText}
				/>
				<MetricStatCard
					title="Published"
					value={statsLoading ? "..." : stats.published}
					description="Live articles"
					icon={FileText}
				/>
				<MetricStatCard
					title="Drafts"
					value={statsLoading ? "..." : stats.drafts}
					description="Unpublished"
					icon={FilePen}
				/>
				<MetricStatCard
					title="This Month"
					value={statsLoading ? "..." : stats.thisMonth}
					description="Published this month"
					icon={Calendar}
					dynamicIcon={stats.thisMonth > 0 ? TrendingUp : undefined}
					dynamicTone="success"
				/>
			</div>

			{/* Articles and Analytics Tabs */}
			<Tabs
				value={tab}
				onValueChange={setTab}
				className="space-y-4"
			>
				<TabsList>
					<TabsTrigger value="articles">Articles</TabsTrigger>
					<TabsTrigger value="queue">Review queue</TabsTrigger>
					<TabsTrigger value="sources">Connected sources</TabsTrigger>
					<TabsTrigger value="analytics">Analytics</TabsTrigger>
				</TabsList>

				<TabsContent value="articles">
					<ArticleList
						onEdit={handleEditArticle}
						onRefresh={() => void refreshStats()}
					/>
				</TabsContent>

				<TabsContent value="queue">
					{tab === "queue" ? <NewsReviewQueue /> : null}
				</TabsContent>

				<TabsContent value="sources">
					{tab === "sources" ? <ConnectedSourcesPanel /> : null}
				</TabsContent>

				<TabsContent value="analytics">
					{tab === "analytics" ? <NewsAnalytics /> : null}
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
