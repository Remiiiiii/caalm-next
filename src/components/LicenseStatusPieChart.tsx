"use client";

import { AlertTriangle, Key } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	computeLicenseStatusPie,
	type LicenseStatusPieSegment,
} from "@/lib/dashboard/license-status-pie";
import { swrConfig } from "@/lib/swr-config";
import type { License } from "@/types/licenses";

interface LicenseStatusPieChartProps {
	/** When provided, skips the duplicate /api/licenses fetch */
	licenses?: License[];
}

const EMPTY_SEGMENTS: LicenseStatusPieSegment[] = [
	{ status: "active", count: 0, percentage: 0, color: "#10B981" },
	{ status: "expiring", count: 0, percentage: 0, color: "#F59E0B" },
	{ status: "expired", count: 0, percentage: 0, color: "#6B7280" },
];

const ALL_LICENSES_KEY = "/api/licenses?limit=500";

async function fetchLicenses(url: string): Promise<License[]> {
	const response = await fetch(url);
	if (!response.ok) throw new Error("Failed to load license data");
	const json = await response.json();
	const payload = json?.data ?? json;
	if (Array.isArray(payload?.licenses)) return payload.licenses as License[];
	if (Array.isArray(payload)) return payload as License[];
	return [];
}

const LicenseStatusPieChart: React.FC<LicenseStatusPieChartProps> = ({
	licenses: propLicenses,
}) => {
	const skipFetch = propLicenses != null;
	const {
		data: fetchedLicenses,
		isLoading,
		error: licensesError,
	} = useSWR<License[]>(
		skipFetch ? null : ALL_LICENSES_KEY,
		fetchLicenses,
		{
			...swrConfig,
			refreshInterval: 30000,
			revalidateOnFocus: false,
		},
	);

	const licenses = useMemo(() => {
		if (propLicenses != null) {
			return Array.isArray(propLicenses) ? propLicenses : [];
		}
		return Array.isArray(fetchedLicenses) ? fetchedLicenses : [];
	}, [propLicenses, fetchedLicenses]);

	const licenseData = useMemo(() => {
		if (!skipFetch && isLoading) return EMPTY_SEGMENTS;
		return computeLicenseStatusPie(licenses).segments;
	}, [licenses, isLoading, skipFetch]);

	const loading = isLoading;
	const error = licensesError;

	const CustomTooltip = ({
		active,
		payload,
	}: {
		active?: boolean;
		payload?: Array<{ payload?: LicenseStatusPieSegment }>;
	}) => {
		if (active && payload?.length) {
			const data = payload[0]?.payload;
			if (!data) return null;
			return (
				<div className="bg-white/90 backdrop-blur-sm border border-white/40 rounded-lg p-3 shadow-lg">
					<p className="font-semibold text-slate-700 capitalize">{data.status}</p>
					<p className="text-sm text-slate-600">
						{data.count} licenses ({data.percentage}%)
					</p>
				</div>
			);
		}
		return null;
	};

	if (loading && !skipFetch) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-2 px-4">
					<div className="flex items-center gap-2">
						<Key className="h-4 w-4 text-slate-600" />
						<CardTitle className="text-sm font-semibold sidebar-gradient-text">
							License Status
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-4 flex items-center justify-center">
					<div className="flex flex-col items-center gap-2 text-slate-500">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#0f5384]" />
						<span className="text-xs">Loading licenses...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error && licenses.length === 0) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-2 px-4">
					<div className="flex items-center gap-2">
						<Key className="h-4 w-4 text-slate-600" />
						<CardTitle className="text-sm font-semibold sidebar-gradient-text">
							License Status
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-4 flex items-center justify-center">
					<p className="text-sm text-slate-500">Unable to load licenses</p>
				</CardContent>
			</Card>
		);
	}

	const totalLicenses = licenses.length;

	return (
		<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col">
			<div className="glass-card-cap" />
			<CardHeader className="pb-3 pt-2 px-4 flex-shrink-0">
				<div className="flex items-center gap-2">
					<Key className="h-4 w-4 text-slate-600" />
					<CardTitle className="text-sm font-semibold sidebar-gradient-text">
						License Status
					</CardTitle>
				</div>
				<div className="text-xs text-slate-500">
					Total:{" "}
					<span className="font-semibold text-slate-700 tabular-nums">
						{totalLicenses}
					</span>{" "}
					licenses
				</div>
			</CardHeader>

			<CardContent className="px-4 pb-2 flex-1 flex flex-col min-h-0">
				<div className="space-y-4 flex-1">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="relative">
								<div className="w-16 h-16 flex min-h-16 min-w-16 items-center justify-center shrink-0">
									<ResponsiveContainer width={64} height={64}>
										<PieChart>
											<Pie
												data={licenseData}
												cx="50%"
												cy="50%"
												innerRadius={12}
												outerRadius={24}
												paddingAngle={1}
												dataKey="count"
											>
												{licenseData.map((entry) => (
													<Cell key={entry.status} fill={entry.color} />
												))}
											</Pie>
											<Tooltip content={<CustomTooltip />} />
										</PieChart>
									</ResponsiveContainer>
								</div>
							</div>
							<div>
								<div className="text-3xl font-bold sidebar-gradient-text tracking-tight tabular-nums">
									{totalLicenses}
								</div>
								<div className="text-sm text-slate-600 capitalize font-medium">
									Total Licenses
								</div>
							</div>
						</div>

						<div className="text-right bg-white/30 rounded-lg px-3 py-1 backdrop-blur-sm">
							<div className="text-xs text-slate-500 font-medium">Active</div>
							<div className="text-lg font-semibold text-slate-700 tabular-nums">
								{licenseData.find((item) => item.status === "active")?.count ||
									0}
							</div>
						</div>
					</div>
					<div className="h-px bg-slate-300" />
					<div className="grid grid-cols-2 gap-2">
						<div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
									<AlertTriangle className="h-4 w-4 text-amber-600" />
								</div>
								<div>
									<div className="text-xs text-slate-500 font-medium">
										Expiring
									</div>
									<div className="text-sm font-bold text-slate-700 tabular-nums">
										{licenseData.find((item) => item.status === "expiring")
											?.count || 0}
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
									<Key className="h-4 w-4 text-slate-600" />
								</div>
								<div>
									<div className="text-xs text-slate-500 font-medium">
										Expired
									</div>
									<div className="text-sm font-bold text-slate-700 tabular-nums">
										{licenseData.find((item) => item.status === "expired")
											?.count || 0}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="mt-3 border-t border-white/20 flex-shrink-0 -translate-y-0.5">
					<div className="flex items-center justify-center">
						<div className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20 min-w-[140px]">
							<div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
							<span className="text-xs text-slate-600 font-medium">
								Live License Data
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default LicenseStatusPieChart;
