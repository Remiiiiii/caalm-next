"use client";

import { AlertTriangle, FileText } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeContractStatusPie } from "@/lib/dashboard/contract-status-pie";
import { swrConfig, swrKeys } from "@/lib/swr-config";
import type { UIFileDoc } from "@/types/files";

interface ContractData {
	status: "active" | "expiring" | "expired";
	count: number;
	percentage: number;
	color: string;
	[key: string]: unknown;
}

interface ContractStatusPieChartProps {
	data?: ContractData[];
	/** When provided, skips the duplicate /api/contracts/all fetch */
	contracts?: UIFileDoc[];
}

const EMPTY_SEGMENTS: ContractData[] = [
	{ status: "active", count: 0, percentage: 0, color: "#10B981" },
	{ status: "expiring", count: 0, percentage: 0, color: "#F59E0B" },
	{ status: "expired", count: 0, percentage: 0, color: "#6B7280" },
];

const ContractStatusPieChart: React.FC<ContractStatusPieChartProps> = ({
	data: propData,
	contracts: propContracts,
}) => {
	const skipFetch = propContracts != null || propData != null;
	const {
		data: fetchedContracts,
		isLoading,
		error: contractsError,
	} = useSWR<UIFileDoc[] | { data?: UIFileDoc[] }>(
		skipFetch ? null : swrKeys.allContracts(),
		swrConfig.fetcher ?? null,
		{
			...swrConfig,
			revalidateOnFocus: false,
		},
	);

	const contracts = useMemo(() => {
		if (propContracts != null) {
			return Array.isArray(propContracts) ? propContracts : [];
		}
		if (Array.isArray(fetchedContracts)) {
			return fetchedContracts;
		}
		if (
			fetchedContracts &&
			typeof fetchedContracts === "object" &&
			Array.isArray((fetchedContracts as { data?: UIFileDoc[] }).data)
		) {
			return (fetchedContracts as { data: UIFileDoc[] }).data;
		}
		return [];
	}, [propContracts, fetchedContracts]);

	const contractData = useMemo(() => {
		if (propData) return propData;
		if (!skipFetch && isLoading) return EMPTY_SEGMENTS;
		return computeContractStatusPie(contracts).segments;
	}, [contracts, propData, isLoading, skipFetch]);

	const loading = isLoading;
	const error = contractsError;

	const CustomTooltip = ({
		active,
		payload,
	}: {
		active?: boolean;
		payload?: Array<{ payload?: ContractData }>;
	}) => {
		if (active && payload?.length) {
			const data = payload[0]?.payload;
			if (!data) return null;
			return (
				<div className="bg-white/90 backdrop-blur-sm border border-white/40 rounded-lg p-3 shadow-lg">
					<p className="font-semibold text-slate-700 capitalize">{data.status}</p>
					<p className="text-sm text-slate-600">
						{data.count} contracts ({data.percentage}%)
					</p>
				</div>
			);
		}
		return null;
	};

	if (loading && !skipFetch) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[290px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-6 px-4">
					<div className="flex items-center gap-2">
						<FileText className="h-4 w-4 text-slate-600" />
						<CardTitle className="text-sm font-semibold sidebar-gradient-text">
							Contract Status
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-4 flex items-center justify-center">
					<div className="flex flex-col items-center gap-2 text-slate-500">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#0f5384]" />
						<span className="text-xs">Loading contracts...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error && contracts.length === 0 && !propData) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[290px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-6 px-4">
					<div className="flex items-center gap-2">
						<FileText className="h-4 w-4 text-slate-600" />
						<CardTitle className="text-sm font-semibold sidebar-gradient-text">
							Contract Status
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-4 flex items-center justify-center">
					<p className="text-sm text-slate-500">Unable to load contracts</p>
				</CardContent>
			</Card>
		);
	}

	const totalContracts = contracts?.length || 0;

	return (
		<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col">
			<div className="glass-card-cap" />
			<CardHeader className="pb-3 pt-6 px-4 flex-shrink-0">
				<div className="flex items-center gap-2">
					<FileText className="h-4 w-4 text-slate-600" />
					<CardTitle className="text-sm font-semibold sidebar-gradient-text">
						Contract Status
					</CardTitle>
				</div>
				<div className="text-xs text-slate-500">
					Total:{" "}
					<span className="font-semibold text-slate-700">{totalContracts}</span>{" "}
					contracts
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
												data={contractData}
												cx="50%"
												cy="50%"
												innerRadius={12}
												outerRadius={24}
												paddingAngle={1}
												dataKey="count"
											>
												{contractData.map((entry) => (
													<Cell key={entry.status} fill={entry.color} />
												))}
											</Pie>
											<Tooltip content={<CustomTooltip />} />
										</PieChart>
									</ResponsiveContainer>
								</div>
							</div>
							<div>
								<div className="text-3xl font-bold sidebar-gradient-text tracking-tight">
									{totalContracts}
								</div>
								<div className="text-sm text-slate-600 capitalize font-medium">
									Total Contracts
								</div>
							</div>
						</div>

						<div className="text-right bg-white/30 rounded-lg px-3 py-1 backdrop-blur-sm">
							<div className="text-xs text-slate-500 font-medium">Active</div>
							<div className="text-lg font-semibold text-slate-700">
								{contractData.find((item) => item.status === "active")?.count ||
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
									<div className="text-sm font-bold text-slate-700">
										{contractData.find((item) => item.status === "expiring")
											?.count || 0}
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
									<FileText className="h-4 w-4 text-slate-600" />
								</div>
								<div>
									<div className="text-xs text-slate-500 font-medium">
										Expired
									</div>
									<div className="text-sm font-bold text-slate-700">
										{contractData.find((item) => item.status === "expired")
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
								Live Contract Data
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default ContractStatusPieChart;
