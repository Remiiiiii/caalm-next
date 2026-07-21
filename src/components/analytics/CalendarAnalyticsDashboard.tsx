"use client";

import {
	AlertCircle,
	Calendar,
	CheckCircle,
	Clock,
	Download,
	FileText,
	Loader2,
	RefreshCw,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AUDIT_PERIOD_OPTIONS, type AuditPeriod } from "@/lib/audits/types";
import { AttachmentEngagementStats } from "./AttachmentEngagementStats";
import { ComplianceDeadlineTracker } from "./ComplianceDeadlineTracker";
import { MeetingLoadChart } from "./MeetingLoadChart";

const periodToDays = (period: AuditPeriod): number => {
	if (period === "7d") return 7;
	if (period === "30d") return 30;
	if (period === "90d") return 90;
	const now = new Date();
	const startOfYear = new Date(now.getFullYear(), 0, 1);
	return Math.max(
		1,
		Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)),
	);
};

interface CalendarAnalyticsData {
	meetingLoad: {
		totalMeetings: number;
		totalHours: number;
		averageDuration: number;
		peakDays: Array<{ day: string; count: number; hours: number }>;
		byDepartment: Array<{
			department: string;
			meetings: number;
			hours: number;
		}>;
		byType: Record<string, number>;
	};
	compliance: {
		upcoming: Array<{
			eventId: string;
			title: string;
			deadlineDate: string;
			daysUntil: number;
			status: "on_track" | "at_risk" | "overdue";
			assignedTo: string;
			department?: string;
		}>;
		atRisk: number;
		overdue: number;
		complianceRate: number;
		upcomingByDepartment: Record<string, number>;
	};
	attachments: {
		total: number;
		totalViews: number;
		totalDownloads: number;
		engagementRate: number;
		topAttachments: Array<{
			attachmentId: string;
			attachmentName: string;
			viewCount: number;
			downloadCount: number;
			uniqueViewers: number;
			eventTitle: string;
			eventDate: string;
		}>;
	};
	resources: {
		totalBookings: number;
		utilizationRate: number;
		topResources: Array<{ resourceId: string; name: string; bookings: number }>;
		byStatus: Record<string, number>;
	};
	dateRange: { start: string; end: string };
}

const fetcher = async (url: string) => {
	const response = await fetch(url);
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		const error = new Error(
			errorData.message ||
				`Failed to fetch calendar analytics: ${response.status}`,
		);
		(error as any).status = response.status;
		(error as any).data = errorData;
		throw error;
	}
	const data = await response.json();
	// If the response contains an error field, treat it as an error
	if (data.error && !data.meetingLoad) {
		const error = new Error(data.message || data.error);
		(error as any).status = response.status;
		(error as any).data = data;
		throw error;
	}
	return data;
};

export const CalendarAnalyticsDashboard: React.FC = () => {
	const [period, setPeriod] = useState<AuditPeriod>("30d");
	const dateRange = periodToDays(period);
	const { data, error, isLoading, isValidating, mutate } =
		useSWR<CalendarAnalyticsData>(
			`/api/analytics/calendar?days=${dateRange}`,
			fetcher,
			{
				refreshInterval: 30000, // Auto-refresh every 30s for live data
				revalidateOnFocus: true,
				revalidateOnReconnect: true,
				keepPreviousData: true,
				onError: (err) => {
					console.error("[CalendarAnalyticsDashboard] SWR Error:", err);
				},
			},
		);

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-navy" />
					<span className="ml-3 text-slate-700">
						Loading calendar analytics...
					</span>
				</div>
			</div>
		);
	}

	const handleExport = () => {
		if (!data?.meetingLoad) return;

		const escapeCsv = (value: string | number) => {
			const str = String(value ?? "");
			return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
		};
		const toRows = (rows: Array<Array<string | number>>) =>
			rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

		const sections: string[] = [];

		sections.push(
			`Calendar analytics,${data.dateRange.start} to ${data.dateRange.end}`,
		);

		sections.push(
			toRows([
				["Meeting load"],
				["Total meetings", data.meetingLoad.totalMeetings],
				["Total hours", data.meetingLoad.totalHours],
				["Average duration (min)", data.meetingLoad.averageDuration],
			]),
		);

		sections.push(
			toRows([
				["Meetings by department", "Meetings", "Hours"],
				...data.meetingLoad.byDepartment.map((d) => [
					d.department,
					d.meetings,
					d.hours,
				]),
			]),
		);

		sections.push(
			toRows([
				["Compliance"],
				["Compliance rate (%)", data.compliance.complianceRate],
				["At risk", data.compliance.atRisk],
				["Overdue", data.compliance.overdue],
			]),
		);

		sections.push(
			toRows([
				[
					"Upcoming deadlines",
					"Deadline",
					"Days until",
					"Status",
					"Assigned to",
				],
				...data.compliance.upcoming.map((c) => [
					c.title,
					c.deadlineDate,
					c.daysUntil,
					c.status,
					c.assignedTo,
				]),
			]),
		);

		sections.push(
			toRows([
				["Attachments"],
				["Total", data.attachments.total],
				["Total views", data.attachments.totalViews],
				["Total downloads", data.attachments.totalDownloads],
				["Engagement rate (%)", data.attachments.engagementRate],
			]),
		);

		const csv = sections.join("\n\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `calendar-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	// Check if we have valid data
	const hasValidData = data?.meetingLoad;

	if (error && !hasValidData) {
		return (
			<div className="space-y-6">
				<Card className="bg-red-50 border-red-200">
					<CardContent className="pt-6">
						<div className="flex items-center space-x-3">
							<AlertCircle className="h-6 w-6 text-red" />
							<div>
								<h3 className="text-lg font-semibold text-red-800">
									Error Loading Calendar Analytics
								</h3>
								<p className="text-red-600">
									{error instanceof Error
										? error.message
										: "Failed to load calendar analytics data. Please try again later."}
								</p>
								<Button
									onClick={() => mutate()}
									size="sm"
									variant="outline"
									className="mt-3"
								>
									<RefreshCw className="h-4 w-4 mr-2" />
									Retry
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// If we don't have data yet, show loading
	if (!data) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-navy" />
					<span className="ml-3 text-slate-700">
						Loading calendar analytics...
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<div className="flex justify-center">
					<div>
						<h1 className="h1 sidebar-gradient-text text-center">
							Calendar Analytics Dashboard
						</h1>
						<p className="body-1 text-slate-700 text-center py-2">
							Meeting load, compliance deadlines, and attachment engagement
							metrics
						</p>
					</div>
				</div>
			</div>

			{/* Calendar Analytics Card */}
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardHeader>
					<div className="flex flex-col gap-3">
						<div>
							<CardTitle className="h2 sidebar-gradient-text">
								Calendar Analytics
							</CardTitle>
							<p className="text-sm text-slate-600 mt-1">
								Track meeting load, upcoming compliance deadlines, and how
								attachments are used across your calendars. Adjust the range or
								refresh to update every metric below.
							</p>
						</div>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-3">
								<div className="w-36 shrink-0">
									<Select
										value={period}
										onValueChange={(v) => setPeriod(v as AuditPeriod)}
									>
										<SelectTrigger className="h-9 shad-input">
											<SelectValue placeholder="Period" />
										</SelectTrigger>
										<SelectContent>
											{AUDIT_PERIOD_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<span className="inline-flex items-center gap-1.5 rounded-full bg-white/30 px-2.5 py-1 text-xs font-medium text-slate-600 backdrop-blur-sm border border-white/20">
									<span
										className={`h-2 w-2 rounded-full ${
											isValidating
												? "bg-blue-400 animate-pulse"
												: "bg-green-400 animate-pulse"
										}`}
									/>
									{isValidating ? "Updating..." : "Live"}
								</span>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={handleExport}
									disabled={!data?.meetingLoad}
									className="primary-btn px-3 sm:px-4"
								>
									<Download className="h-4 w-4" />
									Export
								</Button>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{/* Key Metrics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="pt-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-slate-600 mb-1">Total Events</p>
										<p className="text-2xl font-bold text-navy">
											{data.meetingLoad.totalMeetings}
										</p>
									</div>
									<div className="p-3 bg-blue-100 rounded-lg">
										<Calendar className="h-6 w-6 text-blue-600" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="pt-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-slate-600 mb-1">Meeting Hours</p>
										<p className="text-2xl font-bold text-navy">
											{data.meetingLoad.totalHours.toFixed(1)}
										</p>
									</div>
									<div className="p-3 bg-green-100 rounded-lg">
										<Clock className="h-6 w-6 text-green-600" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="pt-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-slate-600 mb-1">
											Compliance Rate
										</p>
										<p className="text-2xl font-bold text-navy">
											{data.compliance.complianceRate}%
										</p>
									</div>
									<div className="p-3 bg-purple-100 rounded-lg">
										<CheckCircle className="h-6 w-6 text-purple-600" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="pt-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-slate-600 mb-1">
											Attachment Views
										</p>
										<p className="text-2xl font-bold text-navy">
											{data.attachments.totalViews.toLocaleString()}
										</p>
									</div>
									<div className="p-3 bg-orange-100 rounded-lg">
										<FileText className="h-6 w-6 text-orange-600" />
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Main Content Tabs */}
					<Tabs defaultValue="meetings" className="w-full">
						<TabsList className="bg-white/20 backdrop-blur border border-white/40">
							<TabsTrigger value="meetings">Meeting Load</TabsTrigger>
							<TabsTrigger value="compliance">Compliance</TabsTrigger>
							<TabsTrigger value="attachments">Attachments</TabsTrigger>
							<TabsTrigger value="resources">Resources</TabsTrigger>
						</TabsList>

						<TabsContent value="meetings" className="mt-6">
							<MeetingLoadChart data={data.meetingLoad} />
						</TabsContent>

						<TabsContent value="compliance" className="mt-6">
							<ComplianceDeadlineTracker data={data.compliance} />
						</TabsContent>

						<TabsContent value="attachments" className="mt-6">
							<AttachmentEngagementStats data={data.attachments} />
						</TabsContent>

						<TabsContent value="resources" className="mt-6">
							<Card className="glass-card">
								<div className="glass-card-cap" />
								<CardHeader>
									<CardTitle className="h3 text-navy">
										Resource Utilization
									</CardTitle>
									<CardDescription>
										Resource booking statistics and utilization rates
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div>
											<p className="text-sm text-slate-600 mb-2">
												Total Bookings
											</p>
											<p className="text-3xl font-bold text-navy">
												{data.resources.totalBookings}
											</p>
										</div>
										<div>
											<p className="text-sm text-slate-600 mb-2">
												Utilization Rate
											</p>
											<p className="text-3xl font-bold text-navy">
												{data.resources.utilizationRate}%
											</p>
										</div>
									</div>
									{data.resources.topResources.length > 0 && (
										<div className="mt-6">
											<h4 className="text-sm font-semibold text-slate-700 mb-3">
												Top Resources
											</h4>
											<div className="space-y-2">
												{data.resources.topResources.map((resource) => (
													<div
														key={resource.resourceId}
														className="flex items-center justify-between p-3 bg-white/50 rounded-lg"
													>
														<span className="text-sm text-slate-700">
															{resource.name}
														</span>
														<Badge variant="secondary">
															{resource.bookings} bookings
														</Badge>
													</div>
												))}
											</div>
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
};
