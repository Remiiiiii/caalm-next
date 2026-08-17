"use client";

import {
	Activity,
	AlertTriangle,
	CheckCircle,
	Database,
	FileStack,
	FileText,
	RefreshCw,
	Send,
	Server,
	Settings,
	Shield,
	Trash2,
	TrendingUp,
	Users,
	Wifi,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { Models } from "node-appwrite";
import type React from "react";
import { useState } from "react";
import useSWR from "swr";
import CalendarView from "@/components/CalendarView";
import CompanyNewsFeed from "@/components/CompanyNewsFeed";
import ContractExpiryAlertsWidget from "@/components/ContractExpiryAlertsWidget";
import ContractStatusPieChart from "@/components/ContractStatusPieChart";
import DepartmentPerformanceWidget from "@/components/DepartmentPerformanceWidget";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { RiskImpactHeroCard } from "@/components/dashboard/RiskImpactHeroCard";
import FormattedDateTime from "@/components/FormattedDateTime";
import QuickNotesWidget from "@/components/QuickNotesWidget";
import RecentActivity from "@/components/RecentActivity";
import Thumbnail from "@/components/Thumbnail";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import {
	SelectItem,
	SelectScrollable,
} from "@/components/ui/select-scrollable";
import {
	FileItemSkeleton,
	StatCardSkeleton,
	TableRowSkeleton,
} from "@/components/ui/skeletons";
import { WidgetCarousel } from "@/components/ui/widget-carousel";
import WeatherWidget from "@/components/WeatherWidget";
import { OrgUnitPicker } from "@/components/settings/OrgUnitPicker";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useRiskImpactDashboard } from "@/hooks/useRiskImpactDashboard";
import { useUnifiedDashboardData } from "@/hooks/useUnifiedDashboardData";
import { cn } from "@/lib/utils";
import { resolveInviteDepartment } from "../../../../constants";

const ClientDate = dynamic(() => import("@/components/ClientDate"), {
	ssr: false,
});

import type { ContractStatus } from "@/constants/status";

interface Invitation {
	$id: string;
	name: string;
	email: string;
	role: string;
	token: string;
	expiresAt: string;
	status: ContractStatus;
	revoked: boolean;
	$createdAt: string;
}

interface UninvitedUser {
	$id: string;
	email: string;
	fullName: string;
	$createdAt: string;
}

const uninvitedFetcher = async (url: string) => {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) throw new Error("Failed to fetch uninvited users");
	return res.json() as Promise<{ data?: UninvitedUser[]; success?: boolean }>;
};

const fetchUninvitedUsers = (refresh = false) =>
	uninvitedFetcher(
		refresh ? "/api/users/uninvited?refresh=1" : "/api/users/uninvited",
	);

interface FileDocument {
	$id: string;
	$createdAt: string;
	type: string;
	name: string;
	url: string;
	extension: string;
	size?: number;
	owner?: string;
	accountId?: string;
	users?: string[];
	bucketFileId?: string;
}

interface AdminDashboardProps {
	user?:
		| (Models.User<Models.Preferences> & {
				$id: string;
				accountId?: string;
				fullName?: string;
				role?: string;
				division?: string;
				department?: string;
				departmentLabel?: string;
		  })
		| null;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
	// Use the real-time admin stats hook
	const { stats, isLoading, error, refresh } = useAdminStats({
		enableRealTime: true,
		pollingInterval: 30000, // 30 seconds
	});

	const { orgId } = useOrganization();
	const effectiveOrgId = orgId || "default_organization";
	const {
		stats: unifiedStats,
		files,
		invitations,
		isLoading: unifiedLoading,
		refresh: refreshUnified,
		prependInvitation,
	} = useUnifiedDashboardData(
		orgId || "default_organization",
		user?.$id ?? user?.accountId ?? null,
	);

	const { data: uninvitedRes, mutate: refreshUninvited } = useSWR(
		!unifiedLoading && user?.$id ? "/api/users/uninvited" : null,
		uninvitedFetcher,
		{
			revalidateOnFocus: false,
			dedupingInterval: 120000,
		},
	);
	const uninvitedUsers = uninvitedRes?.data ?? [];

	const {
		snapshot: riskImpact,
		isLoading: riskImpactLoading,
		error: riskImpactError,
		refresh: refreshRiskImpact,
	} = useRiskImpactDashboard();

	const { toast } = useToast();

	// Invitation management
	const [inviteForm, setInviteForm] = useState({
		selectedUserId: "",
		role: "",
		department: "",
		division: "",
	});
	const [loadingInvite, setLoadingInvite] = useState(false);
	const [refreshLoading, setRefreshLoading] = useState(false);
	const [resendingToken, setResendingToken] = useState<string | null>(null);
	const [_showRevokeDialog, setShowRevokeDialog] = useState(false);
	const [revokeToken, setRevokeToken] = useState<string | null>(null);
	const [_revokeEmail, setRevokeEmail] = useState<string | null>(null);
	const [revokingToken, setRevokingToken] = useState<string | null>(null);
	const [_showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleteToken, setDeleteToken] = useState<string | null>(null);
	const [_deleteEmail, setDeleteEmail] = useState<string | null>(null);
	const [deletingToken, setDeletingToken] = useState<string | null>(null);
	const [removingInvitations, setRemovingInvitations] = useState<Set<string>>(
		new Set(),
	);
	const [addingInvitations, setAddingInvitations] = useState<Set<string>>(
		new Set(),
	);

	const createInvitation = async (invitationData: Record<string, unknown>) => {
		const response = await fetch("/api/invitations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(invitationData),
		});
		const responseData = await response.json().catch(() => ({}));
		if (!response.ok) {
			const message =
				(typeof responseData.details === "string" && responseData.details) ||
				(typeof responseData.error === "string" && responseData.error) ||
				"Failed to create invitation";
			throw new Error(message);
		}
		const created = responseData.data;

		if (created?.token) {
			await prependInvitation({
				$id: created.$id ?? `temp-${created.token}`,
				name: String(invitationData.name ?? created.name ?? ""),
				email: String(invitationData.email ?? created.email ?? ""),
				role: String(invitationData.role ?? created.role ?? ""),
				token: created.token,
				expiresAt: created.expiresAt,
				status: created.status ?? "pending-review",
				revoked: false,
				$createdAt: created.$createdAt ?? new Date().toISOString(),
			});
		}

		await refreshUnified(undefined, { revalidate: true });
		await refreshUninvited(fetchUninvitedUsers(true), { revalidate: false });
		return created;
	};

	const revokeInvitation = async (token: string) => {
		const response = await fetch(`/api/invitations/${token}/revoke`, {
			method: "PUT",
		});
		if (!response.ok) throw new Error("Failed to revoke invitation");
		await refreshUnified(undefined, { revalidate: true });
	};

	const deleteInvitation = async (token: string) => {
		const response = await fetch(`/api/invitations/${token}/delete`, {
			method: "DELETE",
		});
		if (!response.ok) throw new Error("Failed to delete invitation");
	};

	const handleRefreshUsers = async () => {
		setRefreshLoading(true);
		try {
			await Promise.all([
				refreshUnified(),
				refreshUninvited(fetchUninvitedUsers(true), { revalidate: false }),
			]);
			toast({
				title: "Success",
				description: "User list refreshed successfully",
			});
		} catch (_e) {
			toast({
				title: "Error",
				description: "Failed to refresh user list",
				variant: "destructive",
			});
		} finally {
			setRefreshLoading(false);
		}
	};

	const handleInviteSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteForm.selectedUserId) {
			toast({
				title: "Error",
				description: "Please select a user to invite",
				variant: "destructive",
			});
			return;
		}
		if (!inviteForm.role) {
			toast({
				title: "Error",
				description: "Please select a role",
				variant: "destructive",
			});
			return;
		}
		const inviteDepartment = resolveInviteDepartment(
			inviteForm.department,
			inviteForm.division,
		);
		if (!inviteDepartment) {
			toast({
				title: "Error",
				description: "Select a department before sending the invite.",
				variant: "destructive",
			});
			return;
		}

		setLoadingInvite(true);
		const selectedUser = (uninvitedUsers as UninvitedUser[]).find(
			(u) => u.$id === inviteForm.selectedUserId,
		);
		if (!selectedUser) {
			toast({
				title: "Error",
				description: "Selected user not found",
				variant: "destructive",
			});
			setLoadingInvite(false);
			return;
		}

		try {
			const tempToken = `temp_token_${Date.now()}`;
			setAddingInvitations((prev) => new Set(prev).add(tempToken));
			const created = await createInvitation({
				email: selectedUser.email,
				name: selectedUser.fullName,
				role: inviteForm.role,
				department: inviteDepartment,
				division: inviteForm.division,
				orgId: effectiveOrgId,
				invitedBy: "Admin",
			});

			if (created?.token) {
				setAddingInvitations((prev) => {
					const next = new Set(prev);
					next.delete(tempToken);
					next.add(created.token);
					return next;
				});
			}
			toast({
				title: "Invitation Sent",
				description: `Invitation sent to ${selectedUser.fullName} (${selectedUser.email})`,
			});
			setInviteForm({
				selectedUserId: "",
				role: "",
				department: "",
				division: "",
			});
			setTimeout(() => {
				setAddingInvitations((prev) => {
					const newSet = new Set(prev);
					newSet.delete(tempToken);
					if (created?.token) newSet.delete(created.token);
					return newSet;
				});
			}, 300);
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to send invitation. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoadingInvite(false);
		}
	};

	const handleRevoke = async (token: string, email: string) => {
		setRevokeToken(token);
		setRevokeEmail(email);
		setShowRevokeDialog(true);
	};

	const _cancelRevoke = () => {
		setShowRevokeDialog(false);
		setRevokeToken(null);
		setRevokeEmail(null);
	};

	const _confirmRevoke = async () => {
		if (!revokeToken) return;
		try {
			setRevokingToken(revokeToken);
			setRemovingInvitations((prev) => new Set(prev).add(revokeToken));
			await revokeInvitation(revokeToken);
			toast({
				title: "Invitation Revoked",
				description: "The invitation has been successfully revoked.",
			});
		} catch {
			toast({
				title: "Error",
				description: "Failed to revoke invitation. Please try again.",
				variant: "destructive",
			});
		} finally {
			setShowRevokeDialog(false);
			const token = revokeToken;
			setRevokeToken(null);
			setRevokeEmail(null);
			setRevokingToken(null);
			setTimeout(() => {
				setRemovingInvitations((prev) => {
					const newSet = new Set(prev);
					if (token) newSet.delete(token);
					return newSet;
				});
			}, 300);
		}
	};

	const handleDelete = async (token: string, email: string) => {
		setDeleteToken(token);
		setDeleteEmail(email);
		setShowDeleteDialog(true);
	};

	const _cancelDelete = () => {
		setShowDeleteDialog(false);
		setDeleteToken(null);
		setDeleteEmail(null);
	};

	const _confirmDelete = async () => {
		if (!deleteToken) return;
		try {
			setDeletingToken(deleteToken);
			setRemovingInvitations((prev) => new Set(prev).add(deleteToken));
			const currentData = await refreshUnified();
			if (currentData?.data?.invitations) {
				const updatedInvitations = (
					currentData.data.invitations as Invitation[]
				).filter((inv) => inv.token !== deleteToken);
				await refreshUnified(
					{
						...currentData,
						data: { ...currentData.data, invitations: updatedInvitations },
					},
					{ revalidate: false },
				);
			}
			toast({
				title: "Invitation Deleted",
				description: "The invitation has been permanently deleted.",
			});
			await deleteInvitation(deleteToken);
			await refreshUnified();
		} catch {
			await refreshUnified();
			toast({
				title: "Error",
				description: "Failed to delete invitation. Please try again.",
				variant: "destructive",
			});
		} finally {
			const token = deleteToken;
			setShowDeleteDialog(false);
			setDeleteToken(null);
			setDeleteEmail(null);
			setDeletingToken(null);
			setTimeout(() => {
				setRemovingInvitations((prev) => {
					const newSet = new Set(prev);
					if (token) newSet.delete(token);
					return newSet;
				});
			}, 300);
		}
	};

	const handleResend = async (token: string) => {
		setResendingToken(token);
		try {
			const response = await fetch(`/api/invitations/${token}/resend`, {
				method: "POST",
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to resend invitation");
			}
			const result = await response.json();
			toast({ title: "Success", description: result.message });
		} catch (err) {
			toast({
				title: "Error",
				description:
					err instanceof Error ? err.message : "Failed to resend invitation",
				variant: "destructive",
			});
		} finally {
			setResendingToken(null);
		}
	};

	const getSystemHealthColor = (health: string) => {
		switch (health) {
			case "good":
				return "text-green-600 bg-green-100";
			case "warning":
				return "text-yellow-600 bg-yellow-100";
			case "critical":
				return "text-red-600 bg-red-100";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	const getSystemHealthIcon = (health: string) => {
		switch (health) {
			case "good":
				return <CheckCircle className="h-8 w-8 text-green-600" />;
			case "warning":
				return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
			case "critical":
				return <AlertTriangle className="h-8 w-8 text-red-600" />;
			default:
				return <Settings className="h-8 w-8 text-gray-600" />;
		}
	};

	if (error) {
		return (
			<div className="space-y-6">
				<Card>
					<CardContent className="p-6">
						<div className="text-center text-red-600">
							<p>Failed to load admin statistics</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<DashboardGreeting user={user} />
			<RiskImpactHeroCard
				snapshot={riskImpact}
				isLoading={riskImpactLoading}
				error={riskImpactError}
				onRetry={() => refreshRiskImpact()}
			/>
			{/* Widget Carousel */}
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-3 sm:p-4 lg:p-6">
					<WidgetCarousel ariaLabel="Admin dashboard widgets">
						<ContractExpiryAlertsWidget
							maxVisible={2}
							showSettings={false}
							compact={true}
						/>
						<ContractStatusPieChart />
						<DepartmentPerformanceWidget />
						<CompanyNewsFeed />
						{user && <QuickNotesWidget user={user as any} />}
						<WeatherWidget />
					</WidgetCarousel>
				</CardContent>
			</Card>

			{/* Header Stats */}
			<div className="dashboard-grid">
				{isLoading || unifiedLoading ? (
					[1, 2, 3, 4].map((index) => <StatCardSkeleton key={index} />)
				) : (
					<>
						{/* Total Contracts */}
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium sidebar-gradient-text">
											Total Contracts
										</p>
										<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
											<span>{unifiedStats.totalContracts}</span>
											<StatCardIcon className="ml-2" icon={FileStack} />
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Expiring Soon */}
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium sidebar-gradient-text">
											Expiring Soon
										</p>
										<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
											<span>{unifiedStats.expiringContracts}</span>
											<StatCardIcon className="ml-2" icon={AlertTriangle} />
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Active Users */}
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium sidebar-gradient-text">
											Active Users
										</p>
										<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
											<span>{unifiedStats.activeUsers}</span>
											<StatCardIcon className="ml-2" icon={Users} />
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Compliance Rate */}
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium sidebar-gradient-text">
											Compliance Rate
										</p>
										<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
											<span>{unifiedStats.complianceRate}</span>
											<StatCardIcon className="ml-2" icon={CheckCircle} />
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</>
				)}
			</div>

			{/* Main Content Grid - Reconfigured Layout */}
			<div className="space-y-6">
				{/* Row 1: System Status, System Alerts (col 1) | Activity Overview (col 2) */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Column 1: System Status & Activity Overview  */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* System Status */}
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardHeader className="pb-3">
								<CardTitle className="text-sm font-bold sidebar-gradient-text">
									System Status
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-0">
								{isLoading ? (
									<div className="animate-pulse bg-gray-200 h-16 rounded"></div>
								) : (
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											{getSystemHealthIcon(stats.systemHealth)}
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${getSystemHealthColor(
													stats.systemHealth,
												)}`}
											>
												{stats.systemHealth.toUpperCase()}
											</span>
										</div>
										<p className="text-xs text-slate-dark">
											Overall system performance
										</p>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
											<div className="text-center p-2 bg-blue-50 border border-blue-200 rounded">
												<p className="text-xs text-blue-600 font-medium">
													UPTIME
												</p>
												<p className="text-sm font-bold text-blue-800">99.9%</p>
											</div>
											<div className="text-center p-2 bg-green-50 border border-green-200 rounded">
												<p className="text-xs text-green-600 font-medium">
													RESPONSE
												</p>
												<p className="text-sm font-bold text-green-800">
													120ms
												</p>
											</div>
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Activity Overview */}
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center text-sm font-bold sidebar-gradient-text">
									<Activity className="h-4 w-4 mr-2" />
									Activity Overview
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-0">
								{isLoading ? (
									<div className="space-y-2">
										<div className="animate-pulse bg-gray-200 h-8 rounded"></div>
										<div className="animate-pulse bg-gray-200 h-8 rounded"></div>
									</div>
								) : (
									<div className="space-y-2">
										<div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
											<div className="flex items-center space-x-2">
												<Activity className="h-4 w-4 text-blue-600" />
												<div>
													<p className="text-xs font-medium text-blue-800">
														Total Activities
													</p>
												</div>
											</div>
											<p className="text-lg font-bold text-navy">
												{stats.totalActivities}
											</p>
										</div>

										<div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
											<div className="flex items-center space-x-2">
												<TrendingUp className="h-4 w-4 text-green-600" />
												<div>
													<p className="text-xs font-medium text-green-800">
														Recent Activities
													</p>
												</div>
											</div>
											<p className="text-lg font-bold text-navy">
												{stats.recentActivities}
											</p>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Column 2: System Alerts */}
					<Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
								<AlertTriangle className="h-5 w-5 mr-2" />
								System Alerts
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="space-y-2">
								{stats.pendingUsers > 0 && (
									<div className="flex items-start space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
										<div>
											<p className="text-xs font-medium text-yellow-800">
												{stats.pendingUsers} pending approval
											</p>
										</div>
									</div>
								)}

								{stats.systemHealth === "good" && stats.pendingUsers === 0 && (
									<div className="flex items-start space-x-2 p-2 bg-green-50 border border-green-200 rounded-lg">
										<CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
										<div>
											<p className="text-xs font-medium text-green-800">
												All systems operational
											</p>
											<p className="text-[10px] text-green-600">
												No issues detected
											</p>
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Row 2: Calendar (col 1) | System Monitoring + Quick Actions (col 2) */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Column 1: Calendar - Full Height */}
					{user && (
						<Card className="glass-card min-w-0">
							<div className="glass-card-cap" />
							<CardContent className="min-w-0 overflow-hidden p-3 sm:p-4">
								<CalendarView
									user={user as any}
									onEventCreate={() =>
										toast({
											title: "Success",
											description: "Event created successfully!",
										})
									}
								/>
							</CardContent>
						</Card>
					)}

					{/* Column 2: System Monitoring + Quick Actions */}
					<div className="space-y-6">
						{/* System Monitoring */}
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
									<Server className="h-5 w-5 mr-2" />
									System Monitoring
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="space-y-3">
									<div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
										<div className="flex items-center space-x-3">
											<Database className="h-5 w-5 text-blue-600" />
											<div>
												<p className="text-sm font-medium text-blue-800">
													Database
												</p>
												<p className="text-xs text-blue-600">
													Connection healthy
												</p>
											</div>
										</div>
										<CheckCircle className="h-4 w-4 text-green-600" />
									</div>

									<div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
										<div className="flex items-center space-x-3">
											<Wifi className="h-5 w-5 text-green-600" />
											<div>
												<p className="text-sm font-medium text-green-800">
													API Status
												</p>
												<p className="text-xs text-green-600">
													All endpoints active
												</p>
											</div>
										</div>
										<CheckCircle className="h-4 w-4 text-green-600" />
									</div>

									<div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
										<div className="flex items-center space-x-3">
											<Server className="h-5 w-5 text-gray-600" />
											<div>
												<p className="text-sm font-medium text-gray-800">
													Server Load
												</p>
												<p className="text-xs text-gray-600">
													Normal (45% CPU)
												</p>
											</div>
										</div>
										<CheckCircle className="h-4 w-4 text-green-600" />
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Quick Actions */}
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
									<Settings className="h-5 w-5 mr-2" />
									Quick Actions
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<Button
										variant="outline"
										className="justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40 h-12"
									>
										<Users className="h-4 w-4 mr-2" />
										Users
									</Button>
									<Button
										variant="outline"
										className="justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40 h-12"
									>
										<Shield className="h-4 w-4 mr-2" />
										Security
									</Button>
									<Button
										variant="outline"
										className="justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40 h-12"
									>
										<Activity className="h-4 w-4 mr-2" />
										Logs
									</Button>
									<Button
										variant="outline"
										className="justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40 h-12"
									>
										<TrendingUp className="h-4 w-4 mr-2" />
										Reports
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>

				{/* Row 3: Recent Files Uploaded (col 1) | Recent Activity (col 2) */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Recent Files Uploaded */}
					<Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
								<FileText className="h-5 w-5 mr-2" />
								Recent Files Uploaded
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							{unifiedLoading ? (
								<div className="space-y-3">
									{[1, 2, 3].map((i) => (
										<FileItemSkeleton key={i} />
									))}
								</div>
							) : files && (files as any[]).length > 0 ? (
								<div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
									{(files as any[]).slice(0, 5).map((file: any) => {
										const fileDoc = file as unknown as FileDocument;
										return (
											<div
												key={fileDoc.$id}
												className="flex items-center gap-2 p-3 border border-border rounded-lg"
											>
												<Thumbnail
													type={fileDoc.type}
													extension={fileDoc.extension}
													url={fileDoc.url}
												/>
												<div className="flex flex-col gap-1 min-w-0 flex-1">
													<h4 className="font-medium text-navy truncate text-sm">
														{fileDoc.name}
													</h4>
													<p className="text-xs text-slate-dark">
														<FormattedDateTime
															date={fileDoc.$createdAt as unknown as string}
															className="text-xs text-slate-light"
														/>
													</p>
												</div>
											</div>
										);
									})}
									{(files as any[]).length > 5 && (
										<div className="text-center py-2">
											<p className="text-xs text-slate-light">
												+{(files as any[]).length - 5} more files
											</p>
										</div>
									)}
								</div>
							) : (
								<p className="text-center text-slate-light text-sm py-4">
									No files uploaded
								</p>
							)}
						</CardContent>
					</Card>

					{/* Recent Activity */}
					<RecentActivity />
				</div>
			</div>

			{/* Invite New User to CAALM */}
			<Card className="glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
					<p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[#0f5384]">
						User management
					</p>
					<h2 className="text-xl font-semibold tracking-tight text-slate-700">
						Send invite link
					</h2>
					<p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">
						Grant a new person access to CAALM by selecting their identity and
						access level below.
					</p>
				</div>

				<form onSubmit={handleInviteSubmit}>
					<div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
						<p className="mb-4 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">
							Recipient
						</p>
						<div>
							<label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
								Select a user
								<span className="font-bold text-red" aria-hidden>
									*
								</span>
							</label>
							<div className="flex items-end gap-2.5">
								<div className="min-w-0 flex-1">
									<SelectScrollable
										value={inviteForm.selectedUserId}
										onValueChange={(value) =>
											setInviteForm((prev) => ({
												...prev,
												selectedUserId: value,
											}))
										}
										placeholder="Choose from directory…"
										className="w-full border border-slate-200 bg-white text-slate-700 shadow-sm"
									>
										{(uninvitedUsers as UninvitedUser[]).map((u) => (
											<SelectItem key={u.$id} value={u.$id}>
												<div className="flex items-center gap-3">
													<Avatar name={u.fullName} userId={u.$id} size="sm" />
													<span>
														{u.fullName} ({u.email})
													</span>
												</div>
											</SelectItem>
										))}
									</SelectScrollable>
								</div>
								<Button
									type="button"
									variant="outline"
									onClick={handleRefreshUsers}
									disabled={refreshLoading}
									aria-label="Refresh user list"
									title="Refresh user list"
									className="h-10 w-10 shrink-0 border-slate-200 bg-white p-0 text-slate-600 hover:border-[#0f5384]/30 hover:bg-blue/10 hover:text-[#0f5384]"
								>
									<RefreshCw
										className={cn("h-4 w-4", refreshLoading && "animate-spin")}
									/>
								</Button>
							</div>
							<p className="mt-1.5 text-[11px] text-slate-500">
								Pulled from your connected directory. Refresh if this person was
								just added.
							</p>
							{(uninvitedUsers as UninvitedUser[]).length === 0 && (
								<p className="mt-2 text-xs text-slate-500">
									No Auth users are waiting for an invite. Everyone either has a
									role or already has a pending invitation.
								</p>
							)}
						</div>
					</div>

					<div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
						<p className="mb-4 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">
							Access &amp; permissions
						</p>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)]">
							<div className="min-w-0 space-y-2 md:col-span-2 lg:col-span-1">
								<label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
									Role
									<span className="font-bold text-red" aria-hidden>
										*
									</span>
								</label>
								<SelectScrollable
									value={inviteForm.role}
									onValueChange={(value) =>
										setInviteForm((prev) => ({ ...prev, role: value }))
									}
									placeholder="Select role…"
									className="w-full border border-slate-200 bg-white text-slate-700 shadow-sm"
								>
									<SelectItem value="Organization Admin">
										Organization Admin
									</SelectItem>
									<SelectItem value="Department Manager">
										Department Manager
									</SelectItem>
									<SelectItem value="Viewer">Viewer</SelectItem>
								</SelectScrollable>
							</div>

							<OrgUnitPicker
								layout="inline"
								departmentRequired
								orgId={effectiveOrgId}
								divisionOptional
								departmentCode={inviteForm.department}
								divisionCode={inviteForm.division}
								onDepartmentChange={(value) =>
									setInviteForm((prev) => ({
										...prev,
										department: value,
										division: "",
									}))
								}
								onDivisionChange={(value) =>
									setInviteForm((prev) => ({ ...prev, division: value }))
								}
							/>
						</div>
						{inviteForm.department && (
							<p className="mt-3 text-[11px] text-slate-500">
								Division is optional. Selecting{" "}
								{inviteForm.department.replace(/-/g, " ")} as department is
								enough to send the invite.
							</p>
						)}
					</div>

					<div className="flex flex-col gap-3 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
						<p className="text-[11.5px] leading-relaxed text-slate-600">
							The invite link expires in 7 days.
						</p>
						<Button
							type="submit"
							disabled={
								loadingInvite ||
								(uninvitedUsers as UninvitedUser[]).length === 0
							}
							className="primary-btn h-10 shrink-0 gap-2 px-5 text-[13px] font-semibold"
						>
							{loadingInvite ? "Sending…" : "Send invite"}
							<Send className="h-3.5 w-3.5" />
						</Button>
					</div>
				</form>
			</Card>

			{/* Pending Invitations */}
			<Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
				<CardHeader>
					<CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
						Pending Invitations
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="glass-card-inner overflow-x-auto">
						<table className="min-w-full text-xs">
							<thead className="bg-gray-50 text-center">
								<tr>
									<th className="text-slate-700 text-center px-4 py-2">Name</th>
									<th className="text-slate-700 text-center px-4 py-2">
										Email
									</th>
									<th className="text-slate-700 text-center px-4 py-2">Role</th>
									<th className="text-slate-700 text-center px-4 py-2">
										Invited
									</th>
									<th className="text-slate-700 text-center px-4 py-2">
										Expires
									</th>
									<th className="text-slate-700 text-center px-4 py-2">
										Status
									</th>
									<th className="text-slate-700 text-center px-4 py-2">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{unifiedLoading ? (
									[1, 2, 3].map((i) => <TableRowSkeleton key={i} columns={7} />)
								) : (invitations as Invitation[]).length === 0 ? (
									<tr>
										<td colSpan={7} className="text-center py-8 text-gray-400">
											No pending invitations
										</td>
									</tr>
								) : (
									(invitations as Invitation[]).map((inv) => (
										<tr
											key={inv.$id}
											className={`border-b text-center hover:bg-gray-50 transition-all duration-300 ${
												removingInvitations.has(inv.token)
													? "invitation-removing"
													: addingInvitations.has(inv.token)
														? "invitation-adding"
														: ""
											}`}
										>
											<td className="pl-2">{inv.name}</td>
											<td>{inv.email}</td>
											<td>
												{(inv.role || "").charAt(0).toUpperCase() +
													(inv.role || "").slice(1)}
											</td>
											<td>
												<ClientDate dateString={inv.$createdAt} />
											</td>
											<td>
												<ClientDate dateString={inv.expiresAt} />
											</td>
											<td>
												<span
													className={`inline-block px-2 py-1 rounded text-xs font-medium ${
														(inv.status || "").toLowerCase() === "pending"
															? "bg-[#fef6f0] text-[#ebc620]"
															: (inv.status || "").toLowerCase() === "revoked"
																? "bg-[#fff1f1] text-[#fe8787]"
																: (inv.status || "").toLowerCase() ===
																		"accepted"
																	? "bg-[#ccf3e9] text-[#3dd9b3]"
																	: "bg-gray-100 text-gray-600"
													}`}
												>
													{inv.status}
												</span>
											</td>
											<td className="space-x-2">
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleRevoke(inv.token, inv.email)}
													disabled={revokingToken === inv.token}
													className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
												>
													{revokingToken === inv.token
														? "Revoking..."
														: "Revoke"}
												</Button>
												<Button
													size="sm"
													variant="secondary"
													onClick={() => handleResend(inv.token)}
													disabled={resendingToken === inv.token}
													className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
												>
													{resendingToken === inv.token
														? "Resending..."
														: "Resend"}
												</Button>
												<Button
													size="sm"
													onClick={() => handleDelete(inv.token, inv.email)}
													disabled={deletingToken === inv.token}
													style={{
														backgroundColor: "#ffffff",
														color: "#f87774",
													}}
												>
													{deletingToken === inv.token ? (
														"Deleting..."
													) : (
														<Trash2 className="h-4 w-4" />
													)}
												</Button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default AdminDashboard;
