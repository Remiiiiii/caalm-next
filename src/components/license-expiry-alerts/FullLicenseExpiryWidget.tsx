"use client";

import { AlertTriangle, Clock, Eye, EyeOff } from "lucide-react";
import type React from "react";
import { AlarmControls } from "@/components/contract-expiry-alerts/AlarmControls";
import { UrgencyStats } from "@/components/contract-expiry-alerts/UrgencyStats";
import CountdownTimer from "@/components/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLicenseExpiryRaw } from "@/lib/licenses/licensesListUtils";
import { LicenseEmptyState } from "./LicenseEmptyState";
import { LicenseFilterControls } from "./LicenseFilterControls";
import { LicenseStatusBadges } from "./LicenseStatusBadges";
import type { License } from "./types";

interface FullLicenseExpiryWidgetProps {
	className?: string;
	isLoading: boolean;
	error: Error | null;
	filteredLicenses: License[];
	filterDays: number;
	onFilterChange: (value: number) => void;
	expiringCount: number;
	expiredCount: number;
	expiredLicensesCount: number;
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

export const FullLicenseExpiryWidget: React.FC<
	FullLicenseExpiryWidgetProps
> = ({
	className = "",
	isLoading,
	error,
	filteredLicenses,
	filterDays,
	onFilterChange,
	expiringCount,
	expiredCount,
	expiredLicensesCount,
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
						License Expiry Alerts
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex justify-center pb-4">
						<div className="flex flex-col items-center gap-3">
							<div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
							<p className="text-xs text-slate-500 font-medium">
								Loading licenses...
							</p>
						</div>
					</div>
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="animate-pulse">
								<div className="bg-gray-200 h-24 rounded-lg" />
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
						License Expiry Alerts
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center text-red py-4">
						<p>Failed to load license data</p>
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
							License Expiry Alerts
							{filteredLicenses.length > 0 && (
								<Badge variant="secondary" className="ml-2">
									{filteredLicenses.length}
								</Badge>
							)}
						</CardTitle>

						{expiredLicensesCount > 0 && (
							<div className="flex items-center gap-1">
								<AlertTriangle className="h-4 w-4 text-red" />
								<span className="text-sm text-red font-medium">
									{expiredLicensesCount} expired
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

				<UrgencyStats stats={urgencyStats} />

				{showSettings && !isMinimized && (
					<div className="flex items-center space-x-4 mt-3 pt-3 border-t border-white/20">
						<LicenseFilterControls
							filterDays={filterDays}
							onFilterChange={onFilterChange}
							id="license-filter-full"
							size="md"
						/>

						<div className="flex items-center gap-2">
							<AlarmControls
								isPlaying={isPlaying}
								onSilence={onSilence}
								onDismiss={onDismiss}
								variant="full"
							/>
							<LicenseStatusBadges
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
					{filteredLicenses.length === 0 ? (
						<LicenseEmptyState filterDays={filterDays} variant="full" />
					) : (
						<div className="h-[300px] space-y-4 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
							{filteredLicenses.map((license) => (
								<div key={license.$id} className="min-w-0 overflow-hidden">
									<CountdownTimer
										targetDate={getLicenseExpiryRaw(license) || ""}
										contractName={license.licenseName || "Untitled license"}
										size="sm"
										className="transition-all duration-200 hover:shadow-md"
									/>
								</div>
							))}
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
};
