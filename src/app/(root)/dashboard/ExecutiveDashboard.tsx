"use client";

import {
	AlertTriangle,
	Ban,
	CheckCircle,
	FileText,
	Pencil,
	RefreshCw,
	Send,
	Trash2,
	Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Models } from "node-appwrite";
// In your dashboard page (e.g., src/app/(root)/dashboard/page.tsx)
// import { NotificationDemoButton } from '@/components/NotificationDemoButton';
import { useEffect, useState } from "react";
import useSWR from "swr";
import ClientTimestamp from "@/components/ClientTimestamp";
import CompanyNewsFeed from "@/components/CompanyNewsFeed";
import ContractExpiryAlertsWidget from "@/components/ContractExpiryAlertsWidget";
import ContractStatusPieChart from "@/components/ContractStatusPieChart";
import ContractExpiryModal from "@/components/contract-expiry-modal/ContractExpiryModal";
import DepartmentPerformanceWidget from "@/components/DepartmentPerformanceWidget";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { RiskImpactHeroCard } from "@/components/dashboard/RiskImpactHeroCard";
import FormattedDateTime from "@/components/FormattedDateTime";
import LicenseExpiryAlertsWidget from "@/components/LicenseExpiryAlertsWidget";
import LicenseStatusPieChart from "@/components/LicenseStatusPieChart";
import QuickNotesWidget from "@/components/QuickNotesWidget";
import RecentActivity from "@/components/RecentActivity";
import { OrgUnitPicker } from "@/components/settings/OrgUnitPicker";
import Thumbnail from "@/components/Thumbnail";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { WeatherBriefingLauncher } from "@/components/dashboard-briefing/WeatherBriefingLauncher";
import type { ContractStatus } from "@/constants/status";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { useCombinedExpiryModal } from "@/hooks/useCombinedExpiryModal";
import { useUnifiedDashboardData } from "@/hooks/useUnifiedDashboardData";
import { cn } from "@/lib/utils";
import { resolveInviteDepartment } from "../../../../constants";
import type { UIFileDoc } from "@/types/files";

interface UninvitedUser {
	$id: string;
	email: string;
	fullName: string;
	$createdAt: string;
}

const ClientDate = dynamic(() => import("@/components/ClientDate"), {
	ssr: false,
});

const CalendarView = dynamic(() => import("@/components/CalendarView"), {
	ssr: false,
	loading: () => (
		<div className="flex min-h-[280px] items-center justify-center">
			<span className="text-sm text-slate-500">Loading calendar…</span>
		</div>
	),
});

const uninvitedFetcher = async (url: string) => {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) throw new Error("Failed to fetch uninvited users");
	return res.json() as Promise<{ data?: UninvitedUser[]; success?: boolean }>;
};

const fetchUninvitedUsers = (refresh = false) =>
	uninvitedFetcher(
		refresh ? "/api/users/uninvited?refresh=1" : "/api/users/uninvited",
	);

// Add Invitation type
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

// Add File type
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

interface ExecutiveDashboardProps {
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

// Map invitation status to badge colors
// Now uses the same enum as contracts: ['active', 'inactive', 'pending-review', 'action-required']
const getInvitationStatusBadgeClasses = (status: string): string => {
	const normalizedStatus = status?.toLowerCase?.() ?? "";
	switch (normalizedStatus) {
		case "pending-review":
		case "pending": // Legacy support
			return "bg-[#fef6f0] text-[#ebc620]";
		case "action-required":
			return "bg-[#fff1f1] text-[#fe8787]";
		case "active":
		case "accepted": // Legacy support
			return "bg-[#ccf3e9] text-[#3dd9b3]";
		case "inactive":
		case "revoked": // Legacy support
			return "bg-gray-100 text-gray-600";
		default:
			return "bg-gray-100 text-gray-600";
	}
};

const ExecutiveDashboard = ({ user }: ExecutiveDashboardProps) => {
	const { toast } = useToast();
	const { orgId } = useOrganization();
	const effectiveOrgId = orgId || "default_organization";
	const adminName = "Executive"; // Replace with actual admin name

	// Use unified dashboard data hook (server userId starts fetch without waiting on AuthContext)
	const {
		stats: dashboardStats,
		files,
		invitations,
		contracts: unifiedContracts,
		riskImpact,
		dashboardLicenses,
		isLoading: unifiedLoading,
		lastUpdatedAt,
		refresh: refreshUnified,
		prependInvitation,
	} = useUnifiedDashboardData(
		orgId || "default_organization",
		user?.$id ?? user?.accountId ?? null,
	);

	const contractsFromApi = (unifiedContracts || []) as UIFileDoc[];

	// Uninvited users: after unified settles so it does not compete on cold load
	const { data: uninvitedRes, mutate: refreshUninvited } = useSWR(
		!unifiedLoading && user?.$id ? "/api/users/uninvited" : null,
		uninvitedFetcher,
		{
			revalidateOnFocus: false,
			dedupingInterval: 120000,
		},
	);
	const uninvitedUsers = uninvitedRes?.data ?? [];

	// Combined contracts + licenses expiry modal (0–30 days)
	const {
		itemsToShow,
		isModalOpen,
		closeModal,
		triggerTestModal,
		openForEntityId,
		markItemDismissed,
		refreshLicenses,
		shouldPlaySpeech,
	} = useCombinedExpiryModal(contractsFromApi || []);

	const router = useRouter();
	const searchParams = useSearchParams();

	// Desktop push View → /dashboard?expiryEntity=contract|license&expiryId=…
	useEffect(() => {
		const entity = searchParams.get("expiryEntity");
		const id = searchParams.get("expiryId");
		if ((entity !== "contract" && entity !== "license") || !id) return;
		if (entity === "contract" && !contractsFromApi?.length) return;

		const opened = openForEntityId(entity, id);
		if (opened || entity === "license") {
			const next = new URLSearchParams(searchParams.toString());
			next.delete("expiryEntity");
			next.delete("expiryId");
			const qs = next.toString();
			router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
		}
	}, [searchParams, contractsFromApi, openForEntityId, router]);

	// Handle contract/license status change - refresh unified data + licenses
	const handleContractStatusChange = () => {
		refreshUnified();
		void refreshLicenses();
	};

	// Invitation management functions
	const createInvitation = async (invitationData: Record<string, unknown>) => {
		try {
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
			refreshUninvited(fetchUninvitedUsers(true), { revalidate: false });

			return created;
		} catch (error) {
			console.error("Failed to create invitation:", error);
			throw error;
		}
	};

	const revokeInvitation = async (token: string) => {
		try {
			const response = await fetch(`/api/invitations/${token}/revoke`, {
				method: "PUT",
			});

			if (!response.ok) {
				throw new Error("Failed to revoke invitation");
			}

			// Refresh unified data
			refreshUnified();
		} catch (error) {
			console.error("Failed to revoke invitation:", error);
			throw error;
		}
	};

	const deleteInvitation = async (token: string) => {
		try {
			const response = await fetch(`/api/invitations/${token}/delete`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to delete invitation");
			}

			// Don't refresh here - let the calling function handle it
			// to prevent race conditions and UI flicker
		} catch (error) {
			console.error("Failed to delete invitation:", error);
			throw error;
		}
	};

	// Transform dashboard stats to match component format
	const stats = [
		{
			title: "Total Contracts",
			value: dashboardStats.totalContracts?.toString() || "0",
			icon: FileText,
			color: "text-[#524E4E]",
		},
		{
			title: "Expiring Soon",
			value: dashboardStats.expiringContracts?.toString() || "0",
			icon: AlertTriangle,
			color: "text-[#FF7474]",
		},
		{
			title: "Active Users",
			value: dashboardStats.activeUsers?.toString() || "0",
			icon: Users,
			color: "text-[#56B8FF]",
		},
		{
			title: "Compliance Rate",
			value: dashboardStats.complianceRate || "94%",
			icon: CheckCircle,
			color: "text-[#03AFBF]",
		},
	];

	const pendingApprovals = [
		{
			id: 1,
			type: "User Registration",
			requester: "David Wilson - Admin",
			division: "hr",
		},
		{
			id: 2,
			type: "Contract Proposal",
			title: "New Vendor Agreement",
			amount: "$125,000",
		},
		{
			id: 3,
			type: "Document Access",
			requester: "Emma Davis - Legal",
			resource: "Confidential Audit Files",
		},
	];

	// Invitation management state
	const [inviteForm, setInviteForm] = useState({
		selectedUserId: "",
		role: "",
		department: "",
		division: "",
	});
	const [loading, setLoading] = useState(false);
	const [refreshLoading, setRefreshLoading] = useState(false);
	const [resendingToken, setResendingToken] = useState<string | null>(null);

	// Revoke confirmation dialog state
	const [showRevokeDialog, setShowRevokeDialog] = useState(false);
	const [revokeToken, setRevokeToken] = useState<string | null>(null);
	const [revokeEmail, setRevokeEmail] = useState<string | null>(null);
	const [revokingToken, setRevokingToken] = useState<string | null>(null);

	// Delete confirmation dialog state
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleteToken, setDeleteToken] = useState<string | null>(null);
	const [deleteEmail, setDeleteEmail] = useState<string | null>(null);
	const [deletingToken, setDeletingToken] = useState<string | null>(null);
	const [removingInvitations, setRemovingInvitations] = useState<Set<string>>(
		new Set(),
	);
	const [addingInvitations, setAddingInvitations] = useState<Set<string>>(
		new Set(),
	);

	// SWR handles all data fetching automatically - no manual fetch needed

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
		} catch (error) {
			console.error("Error refreshing users:", error);
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

		setLoading(true);

		// Find the selected user
		const selectedUser = (uninvitedUsers as UninvitedUser[]).find(
			(u: UninvitedUser) => u.$id === inviteForm.selectedUserId,
		);
		if (!selectedUser) {
			toast({
				title: "Error",
				description: "Selected user not found",
				variant: "destructive",
			});
			setLoading(false);
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
				invitedBy: adminName,
			});

			if (created?.token) {
				setAddingInvitations((prev) => {
					const next = new Set(prev);
					next.delete(tempToken);
					next.add(created.token);
					return next;
				});
			}

			// Success feedback
			toast({
				title: "Invitation Sent",
				description: `Invitation sent to ${selectedUser.fullName} (${selectedUser.email})`,
			});

			// Reset form
			setInviteForm({
				selectedUserId: "",
				role: "",
				department: "",
				division: "",
			});

			// Clear the adding state after animation
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
			setLoading(false);
		}
	};

	const handleRevoke = async (token: string, email: string) => {
		setRevokeToken(token);
		setRevokeEmail(email);
		setShowRevokeDialog(true);
	};

	const handleDelete = async (token: string, email: string) => {
		setDeleteToken(token);
		setDeleteEmail(email);
		setShowDeleteDialog(true);
	};

	const confirmRevoke = async () => {
		if (!revokeToken) return;

		try {
			// Add visual feedback - mark as revoking
			setRevokingToken(revokeToken);
			setRemovingInvitations((prev) => new Set(prev).add(revokeToken));

			await revokeInvitation(revokeToken);
			// SWR will automatically refresh the data

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
			setRevokeToken(null);
			setRevokeEmail(null);
			setRevokingToken(null);
			// Clear the removing state after a short delay to allow animation
			setTimeout(() => {
				setRemovingInvitations((prev) => {
					const newSet = new Set(prev);
					newSet.delete(revokeToken!);
					return newSet;
				});
			}, 300);
		}
	};

	const cancelRevoke = () => {
		setShowRevokeDialog(false);
		setRevokeToken(null);
		setRevokeEmail(null);
	};

	const confirmDelete = async () => {
		if (!deleteToken) return;

		try {
			// Add visual feedback - mark as deleting
			setDeletingToken(deleteToken);
			setRemovingInvitations((prev) => new Set(prev).add(deleteToken));

			// Optimistically update the UI by immediately removing the invitation from the cache
			const currentData = await refreshUnified();
			if (currentData?.data?.invitations) {
				const updatedInvitations = (
					currentData.data.invitations as Invitation[]
				).filter((inv: Invitation) => inv.token !== deleteToken);

				// Update the cache immediately
				await refreshUnified(
					{
						...currentData,
						data: {
							...currentData.data,
							invitations: updatedInvitations,
						},
					},
					{ revalidate: false },
				);
			}

			// Show success toast immediately after optimistic update
			toast({
				title: "Invitation Deleted",
				description: "The invitation has been permanently deleted.",
			});

			// Then perform the actual delete operation
			await deleteInvitation(deleteToken);

			// Finally, revalidate to ensure data consistency
			await refreshUnified();
		} catch {
			// If delete fails, refresh to restore the original state
			await refreshUnified();
			toast({
				title: "Error",
				description: "Failed to delete invitation. Please try again.",
				variant: "destructive",
			});
		} finally {
			setShowDeleteDialog(false);
			setDeleteToken(null);
			setDeleteEmail(null);
			setDeletingToken(null);
			// Clear the removing state after a short delay to allow animation
			setTimeout(() => {
				setRemovingInvitations((prev) => {
					const newSet = new Set(prev);
					newSet.delete(deleteToken!);
					return newSet;
				});
			}, 300);
		}
	};

	const cancelDelete = () => {
		setShowDeleteDialog(false);
		setDeleteToken(null);
		setDeleteEmail(null);
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
			toast({
				title: "Success",
				description: result.message,
			});
		} catch (error) {
			console.error("Failed to resend invitation:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to resend invitation",
				variant: "destructive",
			});
		} finally {
			setResendingToken(null);
		}
	};

	return (
		<div className="relative">
			{/* Contract Expiry Modal */}
			<ContractExpiryModal
				items={itemsToShow}
				isOpen={isModalOpen}
				onClose={closeModal}
				onStatusChange={handleContractStatusChange}
				onItemDismissed={markItemDismissed}
				shouldPlaySpeech={shouldPlaySpeech}
			/>
			{/* Background Video */}
			<video
				autoPlay
				loop
				muted
				playsInline
				className="fixed inset-0 w-full h-full object-cover z-[-10] opacity-60 pointer-events-none"
			>
				<source src="/assets/video/wave.mp4" type="video/mp4" />
			</video>
			{/* Main Content Container */}
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<DashboardGreeting
					user={user}
					actions={
						<div className="flex items-start gap-3">
							<div className="text-right">
								<p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
									Last updated
								</p>
								<p className="text-xs text-slate-600">
									<ClientTimestamp updatedAt={lastUpdatedAt} />
								</p>
							</div>

							<div className="flex flex-col items-end gap-2">
								{process.env.NODE_ENV === "development" && (
									<Button
										onClick={triggerTestModal}
										variant="outline"
										size="sm"
										className={cn(
											"h-9 gap-2 border border-dashed border-orange/40 bg-orange/10",
											"px-3 text-xs font-medium text-orange hover:bg-orange/15 hover:border-orange/50",
										)}
									>
										<span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange">
											Dev
										</span>
										<Pencil className="h-3.5 w-3.5" />
										Test expiry modal
									</Button>
								)}
								<WeatherBriefingLauncher
									location="Miami"
									latitude={25.7617}
									longitude={-80.1918}
								/>
							</div>
						</div>
					}
				/>
				<RiskImpactHeroCard
					snapshot={riskImpact}
					isLoading={unifiedLoading}
					error={null}
					onRetry={() => refreshUnified()}
				/>
				<Card className="glass-card mb-6 overflow-visible">
					<div className="glass-card-cap" />
					<CardContent className="relative p-3 sm:p-4 lg:p-6">
						<WidgetCarousel ariaLabel="Executive dashboard widgets">
							<ContractExpiryAlertsWidget
								maxVisible={2}
								showSettings={false}
								compact={true}
								contracts={contractsFromApi}
								alarmEnabled={!isModalOpen}
							/>
							<LicenseExpiryAlertsWidget
								maxVisible={2}
								compact={true}
								licenses={dashboardLicenses}
							/>
							<ContractStatusPieChart contracts={contractsFromApi} />
							<LicenseStatusPieChart licenses={dashboardLicenses} />
							<DepartmentPerformanceWidget />
							<CompanyNewsFeed />
							<QuickNotesWidget user={user ?? undefined} />
						</WidgetCarousel>
					</CardContent>
				</Card>

				{/* Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
					{unifiedLoading
						? [1, 2, 3, 4].map((index) => <StatCardSkeleton key={index} />)
						: stats.map((stat, index) => (
								<Card key={index} className="glass-card">
									<div className="glass-card-cap" />
									<CardContent className="p-4 sm:p-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-medium sidebar-gradient-text">
													{stat.title}
												</p>
												<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
													<span>{stat.value}</span>
													<StatCardIcon
														className="ml-2"
														icon={stat.icon}
														iconClassName={stat.color}
													/>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							))}
				</div>

				{/* Dashboard Content */}
				<div className="relative z-10 py-8">
					<div className="space-y-6">
						<div className="grid items-stretch gap-6 lg:grid-cols-6">
							{/* Recent Activity */}
							<div className="lg:col-span-3">
								<RecentActivity limit={25} />
							</div>

							{/* Calendar View */}
							<Card className="glass-card flex h-full min-w-0 flex-col lg:col-span-3">
								<div className="glass-card-cap" />
								<CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 md:p-6">
									<CalendarView
										user={user}
										onEventClick={(event) => {
											console.log("Event clicked:", event);
											// TODO: Implement event details modal or navigation
										}}
										onDateSelect={(date) => {
											console.log("Date selected:", date);
											// TODO: Implement date-specific actions
										}}
										onEventCreate={(event) => {
											console.log("New event created:", event);
											// Event is now automatically saved to database
											toast({
												title: "Success",
												description: `Event "${event.title}" created successfully!`,
											});
										}}
									/>
								</CardContent>
							</Card>
						</div>

						{/* Recent files uploaded and Pending Approvals */}
						<div className="grid lg:grid-cols-2 gap-6">
							{/* Recent files uploaded */}
							<Card className="glass-card">
								<div className="glass-card-cap" />
								<CardHeader>
									<CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
										Recent Files Uploaded
									</CardTitle>
								</CardHeader>
								<CardContent>
									{unifiedLoading ? (
										<div className="space-y-4">
											{[1, 2, 3].map((i) => (
												<FileItemSkeleton key={i} />
											))}
										</div>
									) : files && files.length > 0 ? (
										<div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
											{(files as Models.Document[])
												.slice(0, 10)
												.map((file: Models.Document) => {
													const fileDoc = file as unknown as FileDocument;
													return (
														<div
															key={file.$id}
															className="bg-white/20 backdrop-blur-md border border-white/30 rounded-lg p-3 shadow-sm"
														>
															<div className="flex justify-between items-start">
																<div className="flex items-center gap-3 flex-1 min-w-0">
																	<Thumbnail
																		type={fileDoc.type}
																		extension={fileDoc.extension}
																		url={fileDoc.url}
																	/>
																	<div className="flex flex-col gap-1 min-w-0 flex-1">
																		<h4 className="font-medium text-slate-700 truncate max-w-[200px]">
																			{fileDoc.name}
																		</h4>
																		<p className="text-xs text-slate-600 mt-1">
																			<FormattedDateTime
																				date={file.$createdAt}
																				className="text-xs text-slate-600"
																			/>
																		</p>
																	</div>
																</div>
																<div className="ml-3 flex-shrink-0">
																	{/* <ActionDropdown
                                file={file} 
                                onStatusChange={refreshFiles}
                              /> */}
																</div>
															</div>
														</div>
													);
												})}
											{files.length > 10 && (
												<div className="text-center py-2">
													<p className="text-xs text-slate-light">
														+{files.length - 10} more files
													</p>
												</div>
											)}
										</div>
									) : (
										<p className="text-center text-slate-light">
											No files uploaded
										</p>
									)}
								</CardContent>
							</Card>

							{/* Pending Approvals */}
							<Card className="glass-card">
								<div className="glass-card-cap" />
								<CardHeader>
									<CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
										Pending Approvals
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{pendingApprovals.map((approval) => (
											<div
												key={approval.id}
												className="bg-white/20 backdrop-blur-md border border-white/30 rounded-lg p-3 shadow-sm"
											>
												<div className="flex justify-between items-start mb-2">
													<h4 className="font-medium text-slate-700">
														{approval.type}
													</h4>
													<div className="flex space-x-2">
														<Button
															size="sm"
															variant="outline"
															className="glass-card text-slate-700 hover:opacity-80 cursor-pointer"
															asChild
														>
															<Link href="/contracts/approvals">Review</Link>
														</Button>
													</div>
												</div>
												<p className="text-sm text-slate-600 mt-1">
													{approval.requester || approval.title}
												</p>
												{approval.division && (
													<p className="text-xs text-slate-500 mt-1">
														Division: {approval.division}
													</p>
												)}
												{approval.amount && (
													<p className="text-xs text-slate-500 mt-1">
														Amount: {approval.amount}
													</p>
												)}
											</div>
										))}
										<Button
											asChild
											className="primary-btn w-full cursor-pointer"
										>
											<Link href="/contracts/approvals">
												Open approvals inbox
											</Link>
										</Button>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Invitation Management Section */}
						<Card className="glass-card overflow-hidden">
							<div className="glass-card-cap" />
							{/* Header */}
							<div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
								<p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[#0f5384]">
									User management
								</p>
								<h2 className="text-xl font-semibold tracking-tight text-slate-700">
									Send invite link
								</h2>
								<p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">
									Grant a new person access to CAALM by selecting their identity
									and access level below.
								</p>
							</div>

							<form onSubmit={handleInviteSubmit}>
								{/* Recipient */}
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
													className="w-full border-[0.25px] border-slate-200 bg-white text-slate-700 shadow-sm"
												>
													{(uninvitedUsers as UninvitedUser[]).map(
														(inviteUser: UninvitedUser) => (
															<SelectItem
																key={inviteUser.$id}
																value={inviteUser.$id}
															>
																<div className="flex items-center gap-3">
																	<Avatar
																		name={inviteUser.fullName}
																		userId={inviteUser.$id}
																		size="sm"
																	/>
																	<span>
																		{inviteUser.fullName} ({inviteUser.email})
																	</span>
																</div>
															</SelectItem>
														),
													)}
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
													className={cn( "h-4 w-4", refreshLoading && "animate-spin", )}
												/>
											</Button>
										</div>
										<p className="mt-1.5 text-[11px] text-slate-500">
											Pulled from your connected directory. Refresh if this
											person was just added.
										</p>
										{(uninvitedUsers as UninvitedUser[]).length === 0 && (
											<p className="mt-2 text-xs text-slate-500">
												No Auth users are waiting for an invite. Everyone either
												has a role or already has a pending invitation.
											</p>
										)}
									</div>
								</div>

								{/* Access & permissions */}
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
												className="w-full border-[0.25px] border-slate-200 bg-white text-slate-700 shadow-sm"
											>
												<SelectItem value="Super Admin">Super Admin</SelectItem>
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
											{inviteForm.department.replace(/-/g, " ")} as department
											is enough to send the invite.
										</p>
									)}
								</div>

								{/* Footer */}
								<div className="flex flex-col gap-3 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
									<p className="text-[11.5px] leading-relaxed text-slate-600">
										The invite link expires in 7 days.
									</p>
									<Button
										type="submit"
										disabled={
											loading ||
											(uninvitedUsers as UninvitedUser[]).length === 0
										}
										className="primary-btn h-10 shrink-0 gap-2 px-5 text-[13px] font-semibold"
									>
										<Send className="h-3.5 w-3.5" />
										{loading ? "Sending…" : "Send invite"}
									</Button>
								</div>
							</form>
						</Card>

						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardHeader>
								<CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
									Pending Invitations
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="glass-card-inner overflow-x-auto">
									<table className="min-w-full text-xs">
										<thead className="bg-white/40 backdrop-blur-md border-b border-white/30 text-center">
											<tr>
												<th className="text-slate-700 text-center px-4 py-2">
													Name
												</th>
												<th className="text-slate-700 text-center px-4 py-2">
													Email
												</th>
												<th className="text-slate-700 text-center px-4 py-2">
													Role
												</th>
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
												[1, 2, 3].map((i) => (
													<TableRowSkeleton key={i} columns={7} />
												))
											) : invitations.length === 0 ? (
												<tr>
													<td
														colSpan={7}
														className="text-center py-8 text-gray-400"
													>
														No pending invitations
													</td>
												</tr>
											) : (
												(invitations as Invitation[]).map((inv: Invitation) => (
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
															{inv.role
																? (inv.role as string).charAt(0).toUpperCase() +
																	(inv.role as string).slice(1).toLowerCase()
																: ""}
														</td>
														<td>
															<ClientDate dateString={inv.$createdAt} />
														</td>
														<td>
															<ClientDate dateString={inv.expiresAt} />
														</td>
														<td>
															<span
																className={`inline-block px-2 py-1 rounded text-xs font-medium ${getInvitationStatusBadgeClasses(
																	inv.status,
																)}`}
															>
																{inv.status}
															</span>
														</td>
														<td className="space-x-2">
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	handleRevoke(inv.token, inv.email)
																}
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
																onClick={() =>
																	handleDelete(inv.token, inv.email)
																}
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

						{/* Enhanced Revoke Confirmation Dialog */}
						<AlertDialog
							open={showRevokeDialog}
							onOpenChange={setShowRevokeDialog}
						>
							<AlertDialogContent className="mx-4 max-w-md rounded-xl shadow-xl">
								<AlertDialogHeader className="text-center pb-4">
									<div className="flex justify-center mb-3">
										<div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
											<AlertTriangle
												className="h-6 w-6 text-amber-600"
												aria-hidden
											/>
										</div>
									</div>
									<AlertDialogTitle className="text-xl sidebar-gradient-text">
										Revoke this invitation?
									</AlertDialogTitle>
									<AlertDialogDescription className="text-slate-600 text-sm mt-2">
										User won&apos;t be able to accept it afterward.
									</AlertDialogDescription>
									<div className="border border-b-0 border-slate-300"></div>
								</AlertDialogHeader>

								<div className="px-6 pb-4">
									<div className="bg-slate-50 rounded-lg p-4 space-y-2">
										{revokeEmail && (
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium text-slate-700">
													Email:
												</span>
												<span className="text-sm text-slate-600">
													{revokeEmail}
												</span>
											</div>
										)}
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-slate-700">
												Date:
											</span>
											<span className="text-sm text-slate-600">
												{new Date().toLocaleDateString()}
											</span>
										</div>
									</div>

									<div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
										<p className="text-xs text-amber-800 font-medium flex items-center gap-2">
											<AlertTriangle
												className="h-3.5 w-3.5 shrink-0"
												aria-hidden
											/>
											This action can&apos;t be undone
										</p>
									</div>
								</div>
								<AlertDialogFooter className="flex-col sm:flex-row gap-3 px-6 pb-6">
									<AlertDialogCancel
										onClick={cancelRevoke}
										className="primary-btn px-3 sm:px-4 w-full sm:w-auto"
									>
										<Ban className="w-4 h-4 mr-2" />
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={confirmRevoke}
										className="w-full sm:w-auto bg-red-500/80 backdrop-blur border border-red-400/50 shadow-md text-slate-700 hover:bg-red-600/80 transition-colors rounded-lg px-4 py-2 font-medium"
									>
										Revoke
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>

						{/* Professional Delete Confirmation Dialog */}
						<AlertDialog
							open={showDeleteDialog}
							onOpenChange={setShowDeleteDialog}
						>
							<AlertDialogContent className="mx-4 max-w-md rounded-lg shadow-2xl">
								<AlertDialogHeader className="pb-1">
									<div className="flex items-center gap-4 mb-4">
										<div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
											<Trash2
												className="h-5 w-5"
												style={{
													color: "#0E638F",
												}}
											/>
										</div>
										<div>
											<AlertDialogTitle className="text-lg font-semibold sidebar-gradient-text">
												Delete Invitation?
											</AlertDialogTitle>
											<AlertDialogDescription className="text-sm text-slate-600 mt-1">
												This action cannot be undone
											</AlertDialogDescription>
										</div>
									</div>
								</AlertDialogHeader>

								<div className="px-6 pb-6">
									<div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
										<h4 className="text-sm font-medium text-slate-700 mb-3">
											Invitation Details
										</h4>
										<div className="space-y-2">
											{deleteEmail && (
												<div className="flex items-center justify-between py-1">
													<span className="text-sm text-slate-600">
														Email Address:
													</span>
													<span className="text-sm font-medium text-slate-700">
														{deleteEmail}
													</span>
												</div>
											)}
											<div className="flex items-center justify-between py-1">
												<span className="text-sm text-slate-600">
													Request Date:
												</span>
												<span className="text-sm font-medium text-slate-700">
													{new Date().toLocaleDateString("en-US", {
														year: "numeric",
														month: "short",
														day: "numeric",
													})}
												</span>
											</div>
										</div>
									</div>

									<div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
										<div className="flex items-start gap-2">
											<div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center mt-0.5">
												<span className="text-xs text-white font-bold">!</span>
											</div>
											<p className="text-sm text-amber-800">
												<strong>Warning:</strong> This will permanently remove
												the invitation from the system. The recipient will no
												longer be able to access their invitation link.
											</p>
										</div>
									</div>
								</div>

								<div className="flex justify-center items-center gap-3 px-6 pb-6 pt-4">
									<AlertDialogCancel
										onClick={cancelDelete}
										className="primary-btn px-3 sm:px-4"
									>
										<Ban className="w-4 h-4 mr-2" />
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={confirmDelete}
										className="delete-btn px-3 sm:px-4"
									>
										Delete Invitation
									</AlertDialogAction>
								</div>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
			</div>{" "}
			{/* Close Main Content Container */}
		</div>
	);
};

export default ExecutiveDashboard;

// Overlay notifier at root of dashboard
// Note: Place after export if using layout; otherwise render inside JSX above.
// Here we render inside the component tree at the top-level container.
