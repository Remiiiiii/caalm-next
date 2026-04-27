"use client";

import { AlertTriangle, Clock, Eye, EyeOff } from "lucide-react";
import type React from "react";
import CountdownTimer from "@/components/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { AlarmControls } from "./AlarmControls";
import { ContractEmptyState } from "./ContractEmptyState";
import { ContractFilterControls } from "./ContractFilterControls";
import { ContractStatusBadges } from "./ContractStatusBadges";
import type { Contract } from "./types";
import { UrgencyStats } from "./UrgencyStats";

interface FullContractExpiryWidgetProps {
	className?: string;
	isLoading: boolean;
	error: Error | null;
	filteredContracts: Contract[];
	filterDays: number;
	onFilterChange: (value: number) => void;
	expiringCount: number;
	expiredCount: number;
	expiredContractsCount: number;
	isPlaying: boolean;
	onSilence: () => void;
	onDismiss: () => void;
	urgencyStats: {
		expired: number;
		critical: number;
		warning: number;
		attention: number;
	};
	isMinimized: boolean;
	onToggleMinimize: () => void;
	showSettings: boolean;
}

export const FullContractExpiryWidget: React.FC<
	FullContractExpiryWidgetProps
> = ({
	className = "",
	isLoading,
	error,
	filteredContracts,
	filterDays,
	onFilterChange,
	expiringCount,
	expiredCount,
	expiredContractsCount,
	isPlaying,
	onSilence,
	onDismiss,
	urgencyStats,
	isMinimized,
	onToggleMinimize,
	showSettings,
}) => {
	if (isLoading) {
		return (
			<Card
				className={`bg-white/30 backdrop-blur border border-white/40 shadow-lg ${className}`}
			>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center text-lg font-bold sidebar-gradient-text">
						<Clock className="h-5 w-5" />
						Contract Expiry Alerts
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex justify-center pb-4">
						<LoadingSpinner
							size="sm"
							label="Loading contracts..."
							className="!p-0"
						/>
					</div>
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="animate-pulse">
								<div className="bg-gray-200 h-24 rounded-lg"></div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card
				className={`bg-white/30 backdrop-blur border border-white/40 shadow-lg ${className}`}
			>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center text-lg font-bold sidebar-gradient-text">
						<AlertTriangle className="h-5 w-5 text-red" />
						Contract Expiry Alerts
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center text-red py-4">
						<p>Failed to load contract data</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card
			className={`bg-white/30 backdrop-blur border border-white/40 shadow-lg ${className}`}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<CardTitle className="flex items-center text-lg font-bold sidebar-gradient-text">
							<Clock className="h-5 w-5" />
							Contract Expiry Alerts
							{filteredContracts.length > 0 && (
								<Badge variant="secondary" className="ml-2">
									{filteredContracts.length}
								</Badge>
							)}
						</CardTitle>

						{/* Expired Contracts Count in Header */}
						{expiredContractsCount > 0 && (
							<div className="flex items-center gap-1">
								<AlertTriangle className="h-4 w-4 text-red" />
								<span className="text-sm text-red font-medium">
									{expiredContractsCount} expired
								</span>
							</div>
						)}
					</div>

					{showSettings && (
						<div className="flex items-center space-x-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={onToggleMinimize}
								className="h-8 w-8 p-0"
								aria-label={isMinimized ? "Expand widget" : "Minimize widget"}
							>
								{isMinimized ? (
									<Eye className="h-4 w-4" />
								) : (
									<EyeOff className="h-4 w-4" />
								)}
							</Button>
						</div>
					)}
				</div>

				{/* Urgency Stats */}
				<UrgencyStats stats={urgencyStats} />

				{/* Filter Controls */}
				{showSettings && !isMinimized && (
					<div className="flex items-center space-x-4 mt-3 pt-3 border-t border-white/20">
						<ContractFilterControls
							filterDays={filterDays}
							onFilterChange={onFilterChange}
							id="contract-filter-full"
							size="md"
						/>

						<div className="flex items-center gap-2">
							<AlarmControls
								isPlaying={isPlaying}
								onSilence={onSilence}
								onDismiss={onDismiss}
								variant="full"
							/>
							<ContractStatusBadges
								expiringCount={expiringCount}
								expiredCount={expiredCount}
								filterDays={filterDays}
								isPlaying={isPlaying}
								size="md"
							/>
						</div>
					</div>
				)}
			</CardHeader>

			{!isMinimized && (
				<CardContent className="pt-0">
					{filteredContracts.length === 0 ? (
						<ContractEmptyState filterDays={filterDays} variant="full" />
					) : (
						<div className="space-y-4 h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
							{filteredContracts.map((contract: Contract) => (
								<CountdownTimer
									key={contract.$id}
									targetDate={contract.contractExpiryDate || ""}
									contractName={contract.contractName}
									size="sm"
									className="transition-all duration-200 hover:shadow-md"
								/>
							))}
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
};
