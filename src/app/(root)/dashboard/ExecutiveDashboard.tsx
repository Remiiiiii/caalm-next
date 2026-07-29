"use client";

import {
	AlertTriangle,
	Ban,
	CheckCircle,
	FileText,
	RefreshCw,
	Trash2,
	Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { type Models, Query } from "node-appwrite";
// In your dashboard page (e.g., src/app/(root)/dashboard/page.tsx)
// import { NotificationDemoButton } from '@/components/NotificationDemoButton';
import { useEffect, useState } from "react";
import CalendarView from "@/components/CalendarView";
import ClientTimestamp from "@/components/ClientTimestamp";
import CompanyNewsFeed from "@/components/CompanyNewsFeed";
import ContractExpiryAlertsWidget from "@/components/ContractExpiryAlertsWidget";
import ContractExpiryNotifier from "@/components/ContractExpiryNotifier";
import ContractStatusPieChart from "@/components/ContractStatusPieChart";
import ContractExpiryModal from "@/components/contract-expiry-modal/ContractExpiryModal";
import DepartmentPerformanceWidget from "@/components/DepartmentPerformanceWidget";
import FormattedDateTime from "@/components/FormattedDateTime";
import LicenseExpiryAlertsWidget from "@/components/LicenseExpiryAlertsWidget";
import LicenseStatusPieChart from "@/components/LicenseStatusPieChart";
import QuickNotesWidget from "@/components/QuickNotesWidget";
import RecentActivity from "@/components/RecentActivity";
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
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { useContractExpiryModal } from "@/hooks/useContractExpiryModal";
import { useContractsExpiring } from "@/hooks/useContractsExpiring";
import { useDashboardLicenses } from "@/hooks/useDashboardLicenses";
import { useUnifiedDashboardData } from "@/hooks/useUnifiedDashboardData";
import { tablesDB } from "@/lib/appwrite/client";
import { appwriteConfig } from "@/lib/appwrite/config";

type NotifierContract = { id: string; name: string; expiryDate: string };

const ClientDate = dynamic(() => import("@/components/ClientDate"), {
	ssr: false,
});

import type { ContractStatus } from "@/constants/status";

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

// Add UninvitedUser type
interface UninvitedUser {
	$id: string;
	email: string;
	fullName: string;
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
	const adminName = "Executive"; // Replace with actual admin name

	// Use unified dashboard data hook
	const {
		stats: dashboardStats,
		files,
		invitations,
		uninvitedUsers,
		isLoading: unifiedLoading,
		refresh: refreshUnified,
	} = useUnifiedDashboardData(orgId || "default_organization");

	// Fetch contracts from /api/contracts/all endpoint (shared by contract widgets)
	const {
		contracts: contractsFromApi,
		isLoading: contractsLoading,
		refresh: refreshContracts,
	} = useContractsExpiring();

	// Single licenses fetch shared by license widgets
	const { licenses: dashboardLicenses } = useDashboardLicenses();

	// Contract expiry modal hook - uses contracts from /api/contracts/all
	const {
		contractsToShow,
		contractsWithDays,
		isModalOpen,
		closeModal,
		triggerTestModal,
		shouldPlaySpeech,
	} = useContractExpiryModal(contractsFromApi || []);

	// Handle contract status change - refresh both unified data and contracts
	const handleContractStatusChange = () => {
		refreshUnified();
		refreshContracts();
	};

	// Invitation management functions
	const createInvitation = async (invitationData: Record<string, unknown>) => {
		try {
			const response = await fetch("/api/invitations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(invitationData),
			});

			if (!response.ok) {
				throw new Error("Failed to create invitation");
			}

			const responseData = await response.json();

			// Refresh unified data
			refreshUnified();

			return responseData.data;
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

	// Contracts for expiry notifier
	const [expiryContracts, setExpiryContracts] = useState<NotifierContract[]>(
		[],
	);
	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const res = await tablesDB.listRows(
					appwriteConfig.databaseId,
					appwriteConfig.contractsCollectionId,
					[
						Query.isNotNull("contractExpiryDate"),
						Query.orderAsc("contractExpiryDate"),
						Query.limit(100),
					],
				);
				if (!cancelled) {
					const items: NotifierContract[] = (res.rows || []).map(
						(raw: Record<string, unknown>) => {
							const id =
								typeof raw.$id === "string" ? raw.$id : String(raw.$id ?? "");
							const nm =
								typeof raw.contractName === "string"
									? raw.contractName
									: typeof raw.name === "string"
										? raw.name
										: "Contract";
							const exp =
								typeof raw.contractExpiryDate === "string"
									? raw.contractExpiryDate
									: String(raw.contractExpiryDate ?? "");
							return { id, name: nm, expiryDate: exp };
						},
					);
					setExpiryContracts(items);
				}
			} catch {
				// silent
			}
		};
		load();
		// re-check at midnight to keep notifier accurate without reloads
		const timer = setInterval(load, 12 * 60 * 60 * 1000);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, []);

	const handleRefreshUsers = async () => {
		setRefreshLoading(true);
		try {
			await refreshUnified();
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
			// Mark as adding for visual feedback
			const tempToken = `temp_token_${Date.now()}`;
			setAddingInvitations((prev) => new Set(prev).add(tempToken));

			// Debug: Log the form values being sent
			console.log("Frontend: Sending invitation with values:", {
				email: selectedUser.email,
				name: selectedUser.fullName,
				role: inviteForm.role,
				department: inviteForm.department,
				division: inviteForm.division,
				divisionType: typeof inviteForm.division,
				divisionLength: inviteForm.division?.length,
			});

			await createInvitation({
				email: selectedUser.email,
				name: selectedUser.fullName,
				role: inviteForm.role,
				department: inviteForm.department,
				division: inviteForm.division,
				orgId,
				invitedBy: adminName,
			});

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
					return newSet;
				});
			}, 300);
		} catch {
			toast({
				title: "Error",
				description: "Failed to send invitation. Please try again.",
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
	const hours = new Date().getHours();
	let greeting = "";
	if (hours < 12) {
		greeting = "Good Morning";
	} else if (hours < 18) {
		greeting = "Good Afternoon";
	} else {
		greeting = "Good Evening";
	}

	// const getDepartmentDisplay = (department: string) => {
	//   switch (department) {
	//     case 'childwelfare':
	//       return 'Child Welfare';
	//     case 'management':
	//       return 'Management';
	//     case 'admin':
	//       return 'Admin';
	//     case 'behavioralhealth':
	//       return 'Behavioral Health';
	//     case 'clinic':
	//       return 'Clinic';
	//     case 'residential':
	//       return 'Residential';
	//     case 'cins-fins-snap':
	//       return 'CFS';
	//     case 'c-suite':
	//       return 'C-Suite';
	//     default:
	//       return department;
	//   }
	// };

	return (
		<div className="relative">
			{/* Contract Expiry Modal */}
			<ContractExpiryModal
				contracts={contractsToShow}
				contractsWithDays={contractsWithDays}
				isOpen={isModalOpen}
				onClose={closeModal}
				onStatusChange={handleContractStatusChange}
				shouldPlaySpeech={shouldPlaySpeech}
			/>
			<ContractExpiryNotifier contracts={expiryContracts} />
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
				{/* Dashboard Header */}
				<div className="flex items-center mb-4 gap-2">
					<div className="h2 font-bold sidebar-gradient-text">
						<h2>{greeting}</h2>
					</div>
					<h1 className="text-xl font-bold text-slate-700">
						{user?.fullName || ""}{" "}
						<span className="text-xl text-slate-light">
							{`| ${user?.division || "Unknown Division"}`}
						</span>
					</h1>
					<div className="text-xs text-slate-500 ml-auto flex items-center gap-3">
						<span>
							Last updated: <ClientTimestamp />
						</span>
						{/* Test button for contract expiry modal - development only */}
						{process.env.NODE_ENV === "development" && (
							<Button
								onClick={triggerTestModal}
								variant="outline"
								size="sm"
								className="bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300 text-xs"
							>
								🧪 Test Expiry Modal
							</Button>
						)}
					</div>
				</div>
				<Card className="glass-card mb-6 overflow-visible">
					<div className="glass-card-cap" />
					<CardContent className="relative p-3 sm:p-4 lg:p-6">
						<WidgetCarousel ariaLabel="Executive dashboard widgets">
							<WeatherWidget
								location="Miami"
								latitude={25.7617}
								longitude={-80.1918}
							/>
							<ContractExpiryAlertsWidget
								maxVisible={2}
								showSettings={false}
								compact={true}
								contracts={contractsFromApi}
							/>
							<ContractStatusPieChart contracts={contractsFromApi} />
							<LicenseExpiryAlertsWidget
								maxVisible={2}
								compact={true}
								licenses={dashboardLicenses}
							/>
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
													<span className="inline-block ml-2 pb-1">
														<stat.icon
															className={`h-8 w-8 ${stat.color.replace(
																"text-",
																"text-",
															)}`}
														/>
													</span>
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
						<div className="grid lg:grid-cols-6 gap-6">
							{/* Recent Activity */}
							<div className="lg:col-span-3">
								<RecentActivity />
							</div>

							{/* Calendar View */}
							<Card className="glass-card lg:col-span-3">
								<div className="glass-card-cap" />
								<CardContent className="p-4 sm:p-6">
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
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardHeader>
								<CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
									Send Invite Link to New Caalm User
								</CardTitle>
							</CardHeader>
							<CardContent>
								<form
									className="flex flex-col gap-4"
									onSubmit={handleInviteSubmit}
								>
									{/* User Selection Section */}
									<div className="flex flex-row gap-2 items-center justify-between">
										<SelectScrollable
											value={inviteForm.selectedUserId}
											onValueChange={(value) =>
												setInviteForm({ ...inviteForm, selectedUserId: value })
											}
											placeholder="Select a user"
											className="glass-card text-slate-700 w-full"
										>
											{(uninvitedUsers as UninvitedUser[]).map(
												(user: UninvitedUser) => (
													<SelectItem key={user.$id} value={user.$id}>
														<div className="flex items-center gap-3">
															<Avatar
																name={user.fullName}
																userId={user.$id}
																size="sm"
															/>
															<span>
																{user.fullName} ({user.email})
															</span>
														</div>
													</SelectItem>
												),
											)}
										</SelectScrollable>

										{/* Refresh button positioned to the right of Select a user dropdown */}
										<Button
											type="button"
											onClick={handleRefreshUsers}
											disabled={refreshLoading}
											className="glass-card text-slate-700 hover:opacity-80"
										>
											<RefreshCw
												className={`h-4 w-4 mr-2 ${
													refreshLoading ? "animate-spin" : ""
												}`}
											/>
											{refreshLoading ? "Refreshing..." : "Refresh User List"}
										</Button>
									</div>

									{/* Role and Department Selection Section */}
									<div className="responsive-filter-row">
										<SelectScrollable
											value={inviteForm.role}
											onValueChange={(value) =>
												setInviteForm({ ...inviteForm, role: value })
											}
											placeholder="Select role"
											className="w-full sm:min-w-[80px] bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
										>
											<SelectItem value="executive">Executive</SelectItem>
											<SelectItem value="manager">Manager</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
										</SelectScrollable>

										<SelectScrollable
											value={inviteForm.department}
											onValueChange={(value) =>
												setInviteForm({ ...inviteForm, department: value })
											}
											placeholder="Select department"
											className="w-full sm:min-w-[180px] bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
										>
											<SelectItem value="IT">IT</SelectItem>
											<SelectItem value="Finance">Finance</SelectItem>
											<SelectItem value="Administration">
												Administration
											</SelectItem>
											<SelectItem value="Legal">Legal</SelectItem>
											<SelectItem value="Operations">Operations</SelectItem>
											<SelectItem value="Sales">Sales</SelectItem>
											<SelectItem value="Marketing">Marketing</SelectItem>
											<SelectItem value="Executive">Executive</SelectItem>
											<SelectItem value="Engineering">Engineering</SelectItem>
										</SelectScrollable>

										<SelectScrollable
											value={inviteForm.division}
											onValueChange={(value) =>
												setInviteForm({ ...inviteForm, division: value })
											}
											placeholder="Select division"
											className="w-full sm:min-w-[150px] bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
										>
											<SelectItem value="behavioral-health">
												Behavioral Health
											</SelectItem>
											<SelectItem value="child-welfare">
												Child Welfare
											</SelectItem>
											<SelectItem value="clinic">Clinic</SelectItem>
											<SelectItem value="c-suite">C-Suite</SelectItem>
											<SelectItem value="cfs">CFS</SelectItem>
											<SelectItem value="hr">Human Resources</SelectItem>
											<SelectItem value="residential">Residential</SelectItem>
											<SelectItem value="support">Support</SelectItem>
											<SelectItem value="help-desk">Help Desk</SelectItem>
											<SelectItem value="accounting">Accounting</SelectItem>
											{/* <SelectItem value="management">Management</SelectItem> */}
										</SelectScrollable>
									</div>

									<Button
										type="submit"
										disabled={
											loading ||
											(uninvitedUsers as UninvitedUser[]).length === 0
										}
										className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
									>
										{loading ? "Inviting..." : "Send Invite"}
									</Button>
								</form>
								{(uninvitedUsers as UninvitedUser[]).length === 0 && (
									<p className="text-sm text-gray-500 mt-2 text-center">
										No users found in Auth database
									</p>
								)}
							</CardContent>
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
														<td className="pl-2 ">{inv.name}</td>
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
									<div className="border border-b-0 border-slate-300 "></div>
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
										<h4 className="text-sm font-medium text-slate-900 mb-3">
											Invitation Details
										</h4>
										<div className="space-y-2">
											{deleteEmail && (
												<div className="flex items-center justify-between py-1">
													<span className="text-sm text-slate-600">
														Email Address:
													</span>
													<span className="text-sm font-medium text-slate-900">
														{deleteEmail}
													</span>
												</div>
											)}
											<div className="flex items-center justify-between py-1">
												<span className="text-sm text-slate-600">
													Request Date:
												</span>
												<span className="text-sm font-medium text-slate-900">
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
										className="primary-btn"
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
