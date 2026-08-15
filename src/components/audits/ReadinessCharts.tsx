"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

export function ReadinessCharts({
	domains,
	severity,
	history,
}: {
	domains: Array<{ label: string; readinessPercent: number }>;
	severity: { critical: number; moderate: number; low: number };
	history: Array<{ label: string; value: number }>;
}) {
	const severityData = [
		{ name: "Critical", value: severity.critical, fill: "#dc2626" },
		{ name: "Moderate", value: severity.moderate, fill: "#d97706" },
		{ name: "Low", value: severity.low, fill: "#64748b" },
	];

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<p className="text-sm font-medium sidebar-gradient-text mb-4">
						Domain readiness
					</p>
					<div className="h-48">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={domains}>
								<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
								<XAxis dataKey="label" tick={{ fontSize: 11 }} />
								<YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
								<Tooltip />
								<Bar
									dataKey="readinessPercent"
									fill="#0f5384"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<p className="text-sm font-medium sidebar-gradient-text mb-4">
						Severity breakdown
					</p>
					<div className="h-48">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={severityData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
								<XAxis dataKey="name" tick={{ fontSize: 11 }} />
								<YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
								<Tooltip />
								<Bar dataKey="value" fill="#0f5384" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<p className="text-sm font-medium sidebar-gradient-text mb-4">
						Score history
					</p>
					<div className="h-48">
						{history.length === 0 ? (
							<p className="text-sm text-slate-600">
								No snapshots yet. Run a weekly audit to start history.
							</p>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={history}>
									<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
									<XAxis dataKey="label" tick={{ fontSize: 11 }} />
									<YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
									<Tooltip />
									<Bar dataKey="value" fill="#03AFBF" radius={[4, 4, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
