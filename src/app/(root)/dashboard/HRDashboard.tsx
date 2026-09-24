"use client";

import {
	AlertTriangle,
	Bell,
	CheckCircle2,
	Clock,
	FileCheck,
	Upload,
	UserPlus,
	Users,
} from "lucide-react";
import type { Models } from "node-appwrite";
import { useMemo } from "react";
import ContractExpiryAlertsWidget from "@/components/ContractExpiryAlertsWidget";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import RecentActivity from "@/components/RecentActivity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	complianceMetricTone,
	complianceNeedReviewCount,
	MetricStatCard,
} from "@/components/ui/metric-stat-card";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUnifiedDashboardData } from "@/hooks/useUnifiedDashboardData";
import { isExpiringWithinDays } from "@/lib/contracts/contractsListUtils";
import { isLicenseExpiringWithinDays } from "@/lib/licenses/licensesListUtils";
import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";

interface HRDashboardProps {
	user?:
		| (Models.User<Models.Preferences> & {
				$id: string;
				accountId?: string;
				fullName?: string;
				name?: string;
				role?: string;
				division?: string;
				department?: string;
				departmentLabel?: string;
		  })
		| null;
}

interface PendingInvitation {
	$id?: string;
	name?: string;
	email?: string;
	role?: string;
	$createdAt?: string;
}

const HRDashboard = ({ user }: HRDashboardProps) => {
	const { orgId } = useOrganization();
	const {
		stats,
		invitations,
		contracts,
		dashboardLicenses,
		isLoading,
	} = useUnifiedDashboardData(
		orgId || "default_organization",
		user?.$id ?? user?.accountId ?? null,
	);

	const files = (contracts || []) as UIFileDoc[];
	const licenses = dashboardLicenses || [];
	const pendingInvites = (invitations || []) as PendingInvitation[];
	const complianceTone = complianceMetricTone(stats.complianceRate);
	const needReview = complianceNeedReviewCount(
		stats.totalContracts,
		stats.complianceRate,
	);

	const expiringItems = useMemo(() => {
		const contractItems = files
			.filter((file) => isExpiringWithinDays(file, 90))
			.map((file) => ({
				id: file.$id,
				title: file.contractName || file.name || "Untitled contract",
				meta: file.department ? String(file.department) : "Contract",
				due: file.contractExpiryDate || "",
				kind: "contract" as const,
			}));
		const licenseItems = licenses
			.filter((license) => isLicenseExpiringWithinDays(license, 90))
			.map((license: License) => ({
				id: license.$id,
				title: license.licenseName || license.licenseNumber,
				meta: license.department || license.licenseType || "License",
				due: license.licenseExpiryDate || "",
				kind: "license" as const,
			}));
		return [...contractItems, ...licenseItems];
	}, [files, licenses]);

	return (
		<div className="space-y-6">
			<DashboardGreeting
				user={user}
				actions={
					<>
						<Button variant="default" className="primary-btn px-3 sm:px-4">
							<UserPlus className="h-4 w-4" />
							Add Employee
						</Button>
						<Button className="primary-btn px-3 sm:px-4">
							<Upload className="h-4 w-4" />
							Upload Training Record
						</Button>
					</>
				}
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<MetricStatCard
					title="Active Employees"
					value={isLoading ? "…" : stats.activeUsers}
					description="Active accounts in this org"
					icon={Users}
				/>
				<MetricStatCard
					title="Compliance Rate"
					value={isLoading ? "…" : stats.complianceRate}
					description={
						needReview != null
							? `${needReview} of ${stats.totalContracts} contracts need review`
							: "Active contracts vs total"
					}
					icon={CheckCircle2}
					iconTone={complianceTone}
					dynamicIcon={
						complianceTone === "danger" ? AlertTriangle : CheckCircle2
					}
					dynamicTone={complianceTone}
					valueTone={complianceTone}
				/>
				<MetricStatCard
					title="Expiring Soon"
					value={isLoading ? "…" : expiringItems.length}
					description="Contracts and licenses within 90 days"
					icon={FileCheck}
					iconTone={expiringItems.length > 0 ? "warning" : "default"}
					dynamicIcon={expiringItems.length > 0 ? Clock : undefined}
					dynamicTone="warning"
					valueTone={expiringItems.length > 0 ? "warning" : "default"}
				/>
				<MetricStatCard
					title="Pending Invitations"
					value={isLoading ? "…" : pendingInvites.length}
					description="People waiting to join"
					icon={Bell}
					iconTone={pendingInvites.length > 0 ? "warning" : "default"}
					dynamicIcon={pendingInvites.length > 0 ? Clock : undefined}
					dynamicTone="warning"
					valueTone={pendingInvites.length > 0 ? "warning" : "default"}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2">
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardHeader>
							<CardTitle className="text-lg font-bold sidebar-gradient-text">
								Expiring contracts and licenses
							</CardTitle>
						</CardHeader>
						<CardContent>
							{expiringItems.length === 0 ? (
								<p className="text-sm text-slate-600 py-4">
									Nothing expires in the next 90 days.
								</p>
							) : (
								<div className="space-y-4">
									{expiringItems.slice(0, 8).map((item) => (
										<div
											key={`${item.kind}-${item.id}`}
											className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
										>
											<div>
												<p className="font-medium text-slate-700">
													{item.title}
												</p>
												<p className="text-sm text-slate-600">{item.meta}</p>
											</div>
											<div className="text-right">
												<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-orange/10 text-orange border-orange/20">
													{item.kind === "license" ? "License" : "Contract"}
												</span>
												{item.due ? (
													<p className="text-xs text-slate-500 mt-1">
														Expires {new Date(item.due).toLocaleDateString()}
													</p>
												) : null}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6">
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardHeader>
							<CardTitle className="text-lg font-bold sidebar-gradient-text">
								Pending invitations
							</CardTitle>
						</CardHeader>
						<CardContent>
							{pendingInvites.length === 0 ? (
								<p className="text-sm text-slate-600">No open invitations.</p>
							) : (
								<div className="space-y-3">
									{pendingInvites.slice(0, 6).map((invite, index) => (
										<div
											key={invite.$id || invite.email || index}
											className="flex justify-between items-start border-b border-slate-200 pb-2 last:border-0"
										>
											<div>
												<p className="text-sm font-medium text-slate-700">
													{invite.name || invite.email || "Invitation"}
												</p>
												<p className="text-xs text-slate-500">
													{invite.role || "Pending"}
												</p>
											</div>
											{invite.$createdAt ? (
												<span className="text-xs text-slate-500">
													{new Date(invite.$createdAt).toLocaleDateString()}
												</span>
											) : null}
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
					<ContractExpiryAlertsWidget maxVisible={3} compact />
					<RecentActivity />
				</div>
			</div>
		</div>
	);
};

export default HRDashboard;
