"use client";

import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface ComplianceDeadline {
	eventId: string;
	title: string;
	deadlineDate: string;
	daysUntil: number;
	status: "on_track" | "at_risk" | "overdue";
	assignedTo: string;
	department?: string;
}

interface ComplianceMetrics {
	upcoming: ComplianceDeadline[];
	atRisk: number;
	overdue: number;
	complianceRate: number;
	upcomingByDepartment: Record<string, number>;
}

interface ComplianceDeadlineTrackerProps {
	data: ComplianceMetrics;
}

export const ComplianceDeadlineTracker: React.FC<
	ComplianceDeadlineTrackerProps
> = ({ data }) => {
	const getStatusIcon = (status: string) => {
		switch (status) {
			case "overdue":
				return <XCircle className="h-4 w-4 text-red-600" />;
			case "at_risk":
				return <AlertCircle className="h-4 w-4 text-amber-600" />;
			case "on_track":
				return <CheckCircle className="h-4 w-4 text-green-600" />;
			default:
				return <Clock className="h-4 w-4 text-slate-600" />;
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "overdue":
				return (
					<Badge variant="destructive" className="bg-red-100 text-red-800">
						Overdue
					</Badge>
				);
			case "at_risk":
				return (
					<Badge className="border-2 border-amber-400 bg-amber-100 text-amber-800">
						At Risk
					</Badge>
				);
			case "on_track":
				return (
					<Badge className="border-2 border-green-400 bg-green-100 text-green-800">
						On Track
					</Badge>
				);
			default:
				return <Badge variant="secondary">Unknown</Badge>;
		}
	};

	const criticalDeadlines = data.upcoming
		.filter((d) => d.status === "overdue" || d.status === "at_risk")
		.slice(0, 10);

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600 mb-1">Compliance Rate</p>
								<p className="text-2xl font-bold text-navy">
									{data.complianceRate}%
								</p>
							</div>
							<CheckCircle className="h-8 w-8 text-green-600" />
						</div>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600 mb-1">Upcoming</p>
								<p className="text-2xl font-bold text-navy">
									{data.upcoming.length}
								</p>
							</div>
							<Clock className="h-8 w-8 text-blue-600" />
						</div>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600 mb-1">At Risk</p>
								<p className="text-2xl font-bold text-amber-600">
									{data.atRisk}
								</p>
							</div>
							<AlertCircle className="h-8 w-8 text-amber-600" />
						</div>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600 mb-1">Overdue</p>
								<p className="text-2xl font-bold text-red-600">
									{data.overdue}
								</p>
							</div>
							<XCircle className="h-8 w-8 text-red-600" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Critical Deadlines */}
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardHeader>
					<CardTitle className="h3 text-navy">Critical Deadlines</CardTitle>
					<CardDescription>
						Deadlines requiring immediate attention (At Risk or Overdue)
					</CardDescription>
				</CardHeader>
				<CardContent>
					{criticalDeadlines.length > 0 ? (
						<div className="space-y-3">
							{criticalDeadlines.map((deadline) => (
								<div
									key={deadline.eventId}
									className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-white/60 hover:bg-white/70 transition-colors"
								>
									<div className="flex items-start space-x-3 flex-1">
										<div className="mt-1">{getStatusIcon(deadline.status)}</div>
										<div className="flex-1 min-w-0">
											<h4 className="font-semibold text-slate-800 mb-1">
												{deadline.title}
											</h4>
											<div className="flex items-center space-x-4 text-sm text-slate-600">
												<span>
													Due:{" "}
													{format(
														new Date(deadline.deadlineDate),
														"MMM d, yyyy",
													)}
												</span>
												<span>
													{deadline.daysUntil < 0
														? `${Math.abs(deadline.daysUntil)} days overdue`
														: `${deadline.daysUntil} days remaining`}
												</span>
												{deadline.department && (
													<span>• {deadline.department}</span>
												)}
											</div>
											<p className="text-xs text-slate-500 mt-1">
												Assigned to: {deadline.assignedTo}
											</p>
										</div>
									</div>
									<div className="ml-4">{getStatusBadge(deadline.status)}</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8">
							<CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
							<p className="text-slate-700 font-medium">
								No critical deadlines at this time
							</p>
							<p className="text-sm text-slate-600 mt-1">
								All upcoming deadlines are on track
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* All Upcoming Deadlines */}
			{data.upcoming.length > 0 && (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardHeader>
						<CardTitle className="h3 text-navy">
							All Upcoming Deadlines
						</CardTitle>
						<CardDescription>
							Complete list of compliance deadlines (next 30 days)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{data.upcoming.slice(0, 20).map((deadline) => (
								<div
									key={deadline.eventId}
									className="flex items-center justify-between p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors"
								>
									<div className="flex items-center space-x-3 flex-1">
										{getStatusIcon(deadline.status)}
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-slate-800">
												{deadline.title}
											</p>
											<p className="text-xs text-slate-600">
												{format(new Date(deadline.deadlineDate), "MMM d, yyyy")}{" "}
												•{" "}
												{deadline.daysUntil < 0
													? `${Math.abs(deadline.daysUntil)} days overdue`
													: `${deadline.daysUntil} days remaining`}
											</p>
										</div>
									</div>
									{getStatusBadge(deadline.status)}
								</div>
							))}
						</div>
						{data.upcoming.length > 20 && (
							<p className="text-sm text-slate-600 mt-4 text-center">
								Showing 20 of {data.upcoming.length} deadlines
							</p>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
};
