"use client";

import { AlertTriangle, Clock } from "lucide-react";
import type React from "react";
import CountdownTimer from "@/components/CountdownTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { AlarmControls } from "./AlarmControls";
import { ContractEmptyState } from "./ContractEmptyState";
import { ContractFilterControls } from "./ContractFilterControls";
import { ContractStatusBadges } from "./ContractStatusBadges";
import type { Contract } from "./types";

interface CompactContractExpiryWidgetProps {
	isLoading: boolean;
	error: Error | null;
	filteredContracts: Contract[];
	filterDays: number;
	onFilterChange: (value: number) => void;
	expiringCount: number;
	expiredCount: number;
	isPlaying: boolean;
	onSilence: () => void;
	onDismiss: () => void;
	className?: string;
}

const COMPACT_HEIGHT =
	"w-full h-full min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]";

export const CompactContractExpiryWidget: React.FC<
	CompactContractExpiryWidgetProps
> = ({
	isLoading,
	error,
	filteredContracts,
	filterDays,
	onFilterChange,
	expiringCount,
	expiredCount,
	isPlaying,
	onSilence,
	onDismiss,
	className = "",
}) => {
	if (isLoading) {
		return (
			<Card
				className={`${COMPACT_HEIGHT} glass-card overflow-hidden ${className}`}
			>
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-4 px-4">
					<div className="flex items-center gap-2">
						<Clock className="h-4 w-4 text-slate-600" />
						<CardTitle className="text-sm font-semibold sidebar-gradient-text">
							Contract Expiry Alerts
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-2 flex items-center justify-center h-full">
					<LoadingSpinner
						size="md"
						label="Loading contracts..."
						className="!p-0"
					/>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card
				className={`${COMPACT_HEIGHT} glass-card overflow-hidden ${className}`}
			>
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-6 px-4">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-4 w-4 text-red" />
						<CardTitle className="text-sm font-semibold sidebar-gradient-text">
							Contract Expiry Alerts
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-2 flex items-center justify-center h-full">
					<div className="text-sm text-red text-center">
						Failed to load contract data
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card
			className={`glass-card ${COMPACT_HEIGHT} flex flex-col overflow-hidden ${className}`}
		>
			<div className="glass-card-cap" />
			<CardHeader className="pb-2 pt-6 px-4 flex-shrink-0">
				<div className="flex items-center gap-2 mb-3">
					<div className="flex items-center gap-2">
						<Clock className="h-4 w-4 text-slate-600" />
						<CardTitle className="text-sm font-semibold sidebar-gradient-text">
							Contract Expiry Alerts
						</CardTitle>
					</div>
				</div>

				{/* Filter Controls */}
				<div className="flex items-center justify-between gap-2">
					<ContractFilterControls
						filterDays={filterDays}
						onFilterChange={onFilterChange}
						id="contract-filter-compact"
						size="sm"
					/>

					<div className="flex items-center gap-2">
						<ContractStatusBadges
							expiringCount={expiringCount}
							expiredCount={expiredCount}
							filterDays={filterDays}
							isPlaying={isPlaying}
							size="sm"
						/>

						<AlarmControls
							isPlaying={isPlaying}
							onSilence={onSilence}
							onDismiss={onDismiss}
							variant="compact"
						/>
					</div>
				</div>
			</CardHeader>

			<CardContent className="px-4 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
				{filteredContracts.length === 0 ? (
					<ContractEmptyState filterDays={filterDays} variant="compact" />
				) : (
					<div className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
						{filteredContracts.map((contract: Contract) => (
							<div
								key={contract.$id}
								className="min-w-0 overflow-hidden rounded-lg border border-white/20 bg-white/20 p-2 backdrop-blur-sm transition-colors duration-200 hover:bg-white/30"
							>
								<CountdownTimer
									targetDate={contract.contractExpiryDate || ""}
									contractName={contract.contractName ?? contract.name ?? ""}
									size="sm"
									className="transition-all duration-200"
								/>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
};
