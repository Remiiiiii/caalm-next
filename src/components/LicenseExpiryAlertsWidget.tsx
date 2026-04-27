"use client";

import { AlertTriangle, Calendar, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import type { License } from "@/types/licenses";

interface LicenseExpiryAlertsWidgetProps {
	maxVisible?: number;
	compact?: boolean;
	licenses?: License[];
}

const fetcher = async (url: string) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error("Failed to fetch");
	const data = await response.json();
	return data.success ? data.data : data;
};

export default function LicenseExpiryAlertsWidget({
	maxVisible = 5,
	compact = false,
	licenses: propsLicenses,
}: LicenseExpiryAlertsWidgetProps) {
	const { data, error, isLoading } = useSWR(
		propsLicenses ? null : "/api/licenses/expiring?days=90",
		fetcher,
		{
			refreshInterval: 30000,
			revalidateOnFocus: false,
		},
	);

	const licenses = propsLicenses || data?.licenses || [];
	const [expanded, setExpanded] = useState(!compact);

	const expiringLicenses = useMemo(() => {
		if (!licenses || licenses.length === 0) return [];

		const now = new Date();
		now.setHours(0, 0, 0, 0);

		return licenses
			.filter((license: License) => {
				const expiryDate = license.licenseExpiryDate || license.expirationDate;
				if (!expiryDate) return false;
				const expiryStr = expiryDate.split("T")[0];
				const [year, month, day] = expiryStr.split("-").map(Number);
				const expiry = new Date(year, month - 1, day);
				expiry.setHours(0, 0, 0, 0);
				return expiry >= now;
			})
			.sort((a: License, b: License) => {
				const aExpiry = a.licenseExpiryDate || a.expirationDate;
				const bExpiry = b.licenseExpiryDate || b.expirationDate;
				if (!aExpiry) return 1;
				if (!bExpiry) return -1;
				return aExpiry.localeCompare(bExpiry);
			})
			.slice(0, expanded ? undefined : maxVisible);
	}, [licenses, maxVisible, expanded]);

	const getDaysUntilExpiry = (expirationDate?: string): number | null => {
		if (!expirationDate) return null;
		try {
			const expiryStr = expirationDate.split("T")[0];
			const [year, month, day] = expiryStr.split("-").map(Number);
			const expiry = new Date(year, month - 1, day);
			expiry.setHours(0, 0, 0, 0);

			const now = new Date();
			now.setHours(0, 0, 0, 0);

			const timeDiff = expiry.getTime() - now.getTime();
			return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
		} catch {
			return null;
		}
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		} catch {
			return "N/A";
		}
	};

	const getUrgencyBadge = (days: number | null) => {
		if (days === null) return null;
		if (days < 0) {
			return <Badge className="bg-red/10 text-red">Expired</Badge>;
		} else if (days <= 30) {
			return <Badge className="bg-orange/10 text-orange">Urgent</Badge>;
		} else if (days <= 60) {
			return <Badge className="bg-yellow/10 text-yellow">Soon</Badge>;
		} else {
			return <Badge className="bg-blue/10 text-blue">Upcoming</Badge>;
		}
	};

	if (isLoading) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex items-center gap-2 mb-4">
						<AlertTriangle className="h-5 w-5 text-orange" />
						<h3 className="text-lg font-semibold sidebar-gradient-text">
							Expiring Licenses
						</h3>
					</div>
					<div className="flex justify-start py-2">
						<LoadingSpinner size="sm" label="Loading..." className="!p-0" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex items-center gap-2 mb-4">
						<AlertTriangle className="h-5 w-5 text-red" />
						<h3 className="text-lg font-semibold sidebar-gradient-text">
							Expiring Licenses
						</h3>
					</div>
					<p className="text-sm text-red">Error loading licenses</p>
				</CardContent>
			</Card>
		);
	}

	if (expiringLicenses.length === 0) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex items-center gap-2 mb-4">
						<AlertTriangle className="h-5 w-5 text-green" />
						<h3 className="text-lg font-semibold sidebar-gradient-text">
							Expiring Licenses
						</h3>
					</div>
					<p className="text-sm text-slate-600">No licenses expiring soon</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-orange" />
						<h3 className="text-lg font-semibold sidebar-gradient-text">
							Expiring Licenses
						</h3>
						<Badge className="bg-orange/10 text-orange">
							{expiringLicenses.length}
						</Badge>
					</div>
					{!expanded && licenses.length > maxVisible && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setExpanded(true)}
							className="text-xs"
						>
							Show All
						</Button>
					)}
				</div>

				<div className="space-y-3">
					{expiringLicenses.map((license: License) => {
						const expiryDate =
							license.licenseExpiryDate || license.expirationDate;
						const days = getDaysUntilExpiry(expiryDate);
						return (
							<div
								key={license.$id}
								className="p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<h4 className="font-medium text-slate-900 text-sm">
												{license.licenseName}
											</h4>
											{getUrgencyBadge(days)}
										</div>
										{license.vendor && (
											<p className="text-xs text-slate-600 mb-1">
												{license.vendor}
											</p>
										)}
										<div className="flex items-center gap-4 text-xs text-slate-600">
											<div className="flex items-center gap-1">
												<Calendar className="h-3 w-3" />
												<span>{formatDate(expiryDate)}</span>
											</div>
											{days !== null && (
												<span>
													{days < 0
														? `${Math.abs(days)} days overdue`
														: `${days} days remaining`}
												</span>
											)}
										</div>
									</div>
									<ChevronRight className="h-4 w-4 text-slate-400" />
								</div>
							</div>
						);
					})}
				</div>

				{expanded && licenses.length > maxVisible && (
					<div className="mt-4 pt-4 border-t border-slate-200">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setExpanded(false)}
							className="w-full text-xs"
						>
							Show Less
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
