"use client";

import { AlertTriangle, Clock } from "lucide-react";
import type React from "react";
import { AlarmControls } from "@/components/contract-expiry-alerts/AlarmControls";
import CountdownTimer from "@/components/CountdownTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLicenseExpiryRaw } from "@/lib/licenses/licensesListUtils";
import { LicenseEmptyState } from "./LicenseEmptyState";
import { LicenseFilterControls } from "./LicenseFilterControls";
import { LicenseStatusBadges } from "./LicenseStatusBadges";
import type { License } from "./types";

interface CompactLicenseExpiryWidgetProps {
	isLoading: boolean;
	error: Error | null;
	filteredLicenses: License[];
	filterDays: number;
	onFilterChange: (value: number) => void;
	expiringCount: number;
	expiredCount: number;
	isPlaying: boolean;
	onSilence: () => void;
	onDismiss: () => void;
	className?: string;
}

const COMPACT_HEIGHT = "w-full h-[200px] sm:h-[250px] lg:h-[300px]";

export const CompactLicenseExpiryWidget: React.FC<
	CompactLicenseExpiryWidgetProps
> = ({
	isLoading,
	error,
	filteredLicenses,
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
							License Expiry Alerts
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-2 flex items-center justify-center h-full">
					<div className="flex flex-col items-center gap-3">
						<div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
						<p className="text-xs text-slate-500 font-medium">
							Loading licenses...
						</p>
					</div>
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
							License Expiry Alerts
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-4 pb-2 flex items-center justify-center h-full">
					<div className="text-sm text-red text-center">
						Failed to load license data
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
							License Expiry Alerts
						</CardTitle>
					</div>
				</div>

				<div
					className={`flex w-full items-center gap-2 ${isPlaying ? "justify-start" : "justify-center"}`}
				>
					<LicenseFilterControls
						filterDays={filterDays}
						onFilterChange={onFilterChange}
						id="license-filter-compact"
						size="sm"
					/>
					<LicenseStatusBadges
						expiringCount={expiringCount}
						expiredCount={expiredCount}
						filterDays={filterDays}
						size="sm"
					/>
					<AlarmControls
						isPlaying={isPlaying}
						onSilence={onSilence}
						onDismiss={onDismiss}
						variant="compact"
					/>
				</div>
			</CardHeader>

			<CardContent className="px-4 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
				{filteredLicenses.length === 0 ? (
					<LicenseEmptyState filterDays={filterDays} variant="compact" />
				) : (
					<div
						className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain pr-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
						role="region"
						aria-label="Expiring licenses"
					>
						{filteredLicenses.map((license) => (
							<div
								key={license.$id}
								className="min-w-0 overflow-hidden rounded-lg border border-white/20 bg-white/20 p-2 backdrop-blur-sm transition-colors duration-200 hover:bg-white/30"
							>
								<CountdownTimer
									targetDate={getLicenseExpiryRaw(license) || ""}
									contractName={license.licenseName || "Untitled license"}
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
