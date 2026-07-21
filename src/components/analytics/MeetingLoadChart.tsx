"use client";

import { Calendar, Clock, TrendingUp } from "lucide-react";
import type React from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface MeetingLoadData {
	totalMeetings: number;
	totalHours: number;
	averageDuration: number;
	peakDays: Array<{ day: string; count: number; hours: number }>;
	byDepartment: Array<{ department: string; meetings: number; hours: number }>;
	byType: Record<string, number>;
}

interface MeetingLoadChartProps {
	data: MeetingLoadData;
}

const COLORS = [
	"#0f5384",
	"#03AFBF",
	"#4CAF50",
	"#FF9800",
	"#9C27B0",
	"#F44336",
];

export const MeetingLoadChart: React.FC<MeetingLoadChartProps> = ({ data }) => {
	// Prepare data for charts
	const peakDaysData = data.peakDays.map((day) => ({
		name: day.day,
		meetings: day.count,
		hours: Math.round(day.hours * 10) / 10,
	}));

	const byTypeData = Object.entries(data.byType).map(([type, count]) => ({
		name: type.charAt(0).toUpperCase() + type.slice(1),
		value: count,
	}));

	const byDepartmentData =
		data.byDepartment.length > 0
			? data.byDepartment.map((dept) => ({
					name: dept.department,
					meetings: dept.meetings,
					hours: Math.round(dept.hours * 10) / 10,
				}))
			: [
					{
						name: "All Departments",
						meetings: data.totalMeetings,
						hours: data.totalHours,
					},
				];

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600 mb-1">Total Meetings</p>
								<p className="text-2xl font-bold text-navy">
									{data.totalMeetings}
								</p>
							</div>
							<Calendar className="h-8 w-8 text-blue-600" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600 mb-1">Total Hours</p>
								<p className="text-2xl font-bold text-navy">
									{data.totalHours.toFixed(1)}
								</p>
							</div>
							<Clock className="h-8 w-8 text-green-600" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600 mb-1">Avg Duration</p>
								<p className="text-2xl font-bold text-navy">
									{data.averageDuration.toFixed(1)}h
								</p>
							</div>
							<TrendingUp className="h-8 w-8 text-purple-600" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Peak Days Chart */}
			<Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
				<CardHeader>
					<CardTitle className="h3 text-navy">
						Meeting Load by Day of Week
					</CardTitle>
					<CardDescription>
						Distribution of meetings and hours across the week
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={peakDaysData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
							<XAxis
								dataKey="name"
								stroke="#64748b"
								style={{ fontSize: "12px" }}
							/>
							<YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
							<Tooltip
								contentStyle={{
									backgroundColor: "rgba(255, 255, 255, 0.95)",
									border: "1px solid #e2e8f0",
									borderRadius: "8px",
								}}
							/>
							<Legend />
							<Bar dataKey="meetings" fill="#0f5384" name="Meetings" />
							<Bar dataKey="hours" fill="#03AFBF" name="Hours" />
						</BarChart>
					</ResponsiveContainer>
				</CardContent>
			</Card>

			{/* Meeting Types Distribution */}
			{byTypeData.length > 0 && (
				<Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
					<CardHeader>
						<CardTitle className="h3 text-navy">
							Meeting Types Distribution
						</CardTitle>
						<CardDescription>Breakdown of events by type</CardDescription>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={300}>
							<PieChart>
								<Pie
									data={byTypeData}
									cx="50%"
									cy="50%"
									labelLine={false}
									label={({ name, percent }) =>
										`${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
									}
									outerRadius={100}
									fill="#8884d8"
									dataKey="value"
								>
									{byTypeData.map((_entry, index) => (
										<Cell
											key={`cell-${index}`}
											fill={COLORS[index % COLORS.length]}
										/>
									))}
								</Pie>
								<Tooltip
									contentStyle={{
										backgroundColor: "rgba(255, 255, 255, 0.95)",
										border: "1px solid #e2e8f0",
										borderRadius: "8px",
									}}
								/>
							</PieChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			)}

			{/* Department Breakdown */}
			{byDepartmentData.length > 0 && (
				<Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
					<CardHeader>
						<CardTitle className="h3 text-navy">
							Meeting Load by Department
						</CardTitle>
						<CardDescription>
							Department-wise meeting statistics
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={300}>
							<BarChart data={byDepartmentData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
								<XAxis
									dataKey="name"
									stroke="#64748b"
									style={{ fontSize: "12px" }}
									angle={-45}
									textAnchor="end"
									height={80}
								/>
								<YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
								<Tooltip
									contentStyle={{
										backgroundColor: "rgba(255, 255, 255, 0.95)",
										border: "1px solid #e2e8f0",
										borderRadius: "8px",
									}}
								/>
								<Legend />
								<Bar dataKey="meetings" fill="#0f5384" name="Meetings" />
								<Bar dataKey="hours" fill="#03AFBF" name="Hours" />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			)}
		</div>
	);
};
