"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	AlertCircle,
	AlertTriangle,
	BarChart3,
	CalendarDays,
	CheckCircle,
	ClipboardCheck,
	ClipboardList,
	Clock,
	FileText,
	Link as LinkIcon,
	Pencil,
	RefreshCw,
	Send,
	SquareArrowOutUpRight,
	Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Models } from "node-appwrite";
// In your dashboard page (e.g., src/app/(root)/dashboard/page.tsx)
// import { NotificationDemoButton } from '@/components/NotificationDemoButton';
import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import useSWR from "swr";
import ClientTimestamp from "@/components/ClientTimestamp";
import CompanyNewsFeed from "@/components/CompanyNewsFeed";
import ContractExpiryAlertsWidget from "@/components/ContractExpiryAlertsWidget";
import ContractStatusPieChart from "@/components/ContractStatusPieChart";
import ContractExpiryModal from "@/components/contract-expiry-modal/ContractExpiryModal";
import DepartmentPerformanceWidget from "@/components/DepartmentPerformanceWidget";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { PendingInvitationsCard } from "@/components/dashboard/PendingInvitationsCard";
import type { PendingInvitationRow } from "@/components/dashboard/pending-invitations-types";
import {
	type RecentFileItem,
	RecentFilesUploadedCard,
} from "@/components/dashboard/RecentFilesList";
import { RiskImpactHeroCard } from "@/components/dashboard/RiskImpactHeroCard";
import { WeatherBriefingLauncher } from "@/components/dashboard-briefing/WeatherBriefingLauncher";
import LicenseExpiryAlertsWidget from "@/components/LicenseExpiryAlertsWidget";
import LicenseStatusPieChart from "@/components/LicenseStatusPieChart";
import {
	fadeLeft,
	fadeRight,
	fadeUp,
	scaleIn,
	softRise,
	staggerContainer,
	viewportOnce,
} from "@/components/landing/motion";
import QuickNotesWidget from "@/components/QuickNotesWidget";
import RecentActivity from "@/components/RecentActivity";
import { OrgUnitPicker } from "@/components/settings/OrgUnitPicker";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	complianceMetricTone,
	complianceNeedReviewCount,
	MetricFlatSparkline,
	MetricProgressRing,
	MetricReviewLink,
	MetricSegmentBar,
	MetricStatCard,
	MetricStatDotsBackdrop,
	parseMetricPercent,
	useInViewReady,
} from "@/components/ui/metric-stat-card";
import {
	SelectItem,
	SelectScrollable,
} from "@/components/ui/select-scrollable";
import { StatCardSkeleton } from "@/components/ui/skeletons";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { WidgetCarousel } from "@/components/ui/widget-carousel";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { useCombinedExpiryModal } from "@/hooks/useCombinedExpiryModal";
import { useDashboardWidgetBundle } from "@/hooks/useDashboardWidgetBundle";
import { useUnifiedDashboardData } from "@/hooks/useUnifiedDashboardData";
import { useUpdateExpiredOnce } from "@/hooks/useUpdateExpiredOnce";
import { isDemoMode } from "@/lib/config/demo-mode";
import { refreshDashboardInvitations } from "@/lib/ui/refreshDashboardInvitations";
import { useCtaButtonClass } from "@/lib/ui/use-cta-button-class";
import { cn } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";
import { resolveInviteDepartment } from "../../../../constants";

interface UninvitedUser {
	$id: string;
	email: string;
	fullName: string;
	$createdAt: string;
}

const CalendarView = dynamic(() => import("@/components/CalendarView"), {
	ssr: false,
	loading: () => (
		<div className="flex min-h-[280px] items-center justify-center">
			<span className="text-sm text-slate-500">Loading calendar…</span>
		</div>
	),
});

const slaMetricsFetcher = async (url: string) => {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) throw new Error("Failed to fetch portfolio accountability");
	return res.json() as Promise<{
		success?: boolean;
		metrics?: {
			velocity?: {
				sla?: {
					openItems: number;
					atRisk: number;
					breached: number;
					avgStepHours: number | null;
					breachRate: number;
				};
			};
			accountability?: {
				pending: number;
				overduePending: number;
			};
			expiration?: {
				unintentionalRate: number;
			};
		};
	}>;
};

const uninvitedFetcher = async (url: string) => {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) throw new Error("Failed to fetch uninvited users");
	return res.json() as Promise<{ data?: UninvitedUser[]; success?: boolean }>;
};

const fetchUninvitedUsers = (refresh = false) =>
	uninvitedFetcher(
		refresh ? "/api/users/uninvited?refresh=1" : "/api/users/uninvited",
	);

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

const ExecutiveDashboard = ({ user }: ExecutiveDashboardProps) => {
	const cta = useCtaButtonClass();
	const { toast } = useToast();
	const { orgId } = useOrganization();
	const reduceMotion = useReducedMotion();
	const effectiveOrgId = orgId || "default_organization";
	const adminName = "Executive"; // Replace with actual admin name
	// Landing-page style: each block animates when it scrolls into view.
	const reveal = reduceMotion
		? undefined
		: {
				initial: "hidden" as const,
				whileInView: "visible" as const,
				viewport: viewportOnce,
			};
	const revealSolo = (variants: typeof fadeUp) =>
		reduceMotion ? undefined : { ...reveal, variants };
	const revealStagger = reduceMotion
		? undefined
		: { ...reveal, variants: staggerContainer };
	const revealItem = (variants: typeof fadeUp) =>
		reduceMotion ? undefined : { variants };

	// Use unified dashboard data hook (server userId starts fetch without waiting on AuthContext)
	const {
		stats: dashboardStats,
		files,
		invitations,
		contracts: unifiedContracts,
		riskImpact,
		dashboardLicenses,
		recentActivities,
		isLoading: unifiedLoading,
		lastUpdatedAt,
		refresh: refreshUnified,
		prependInvitation,
		removeInvitation,
	} = useUnifiedDashboardData(
		orgId || "default_organization",
		user?.$id ?? user?.accountId ?? null,
	);

	const contractsFromApi = (unifiedContracts || []) as UIFileDoc[];
	useUpdateExpiredOnce();
	const { bundle, isLoading: bundleLoading } = useDashboardWidgetBundle({
		enabled: true,
		newsLimit: 5,
		userId: user?.$id ?? user?.accountId ?? null,
	});
	// Show contract/license widgets as soon as unified data lands; news/notes/perf
	// fill from the bundle (or their own fetch) without blocking the carousel.
	const carouselReady = !unifiedLoading;

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

	const slaMetricsUrl = orgId
		? `/api/analytics/portfolio-accountability?orgId=${encodeURIComponent(orgId)}&period=30d`
		: "/api/analytics/portfolio-accountability?period=30d";
	const { data: slaMetricsRes } = useSWR(slaMetricsUrl, slaMetricsFetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 120000,
	});
	const slaMetrics = slaMetricsRes?.metrics?.velocity?.sla;
	const accountability = slaMetricsRes?.metrics?.accountability;
	const expiration = slaMetricsRes?.metrics?.expiration;

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	// A pending deep-link resume (push notification "View" or "Back to
	// alert" from the details page) must win the race against the default
	// auto-open-at-index-0 effect below — otherwise the modal opens on the
	// first queue item before the resume effect gets a chance to redirect it.
	const hasPendingExpiryResume = Boolean(
		searchParams?.get("expiryEntity") && searchParams?.get("expiryId"),
	);

	// Combined expiry modal: trigger 0–30d; queue shows −30d…+90d
	const {
		itemsToShow,
		isModalOpen,
		closeModal,
		parkModal,
		parkedSession,
		resumeIndex,
		resumeParkedSession,
		triggerDevTestModal,
		triggerDemoTestModal,
		openForEntityId,
		markItemDismissed,
		refreshLicenses,
		shouldPlaySpeech,
	} = useCombinedExpiryModal(contractsFromApi || [], {
		suppressAutoOpen: hasPendingExpiryResume,
	});
	const showDevExpiryTest = process.env.NODE_ENV === "development";
	const showDemoExpiryTest = isDemoMode();

	// Desktop push View → /dashboard?expiryEntity=contract|license&expiryId=…
	// Handle each deep-link once — re-running after open collapses a good
	// multi-item resume into the 1-item fallback (shown-load / dep churn).
	const handledExpiryDeepLinkRef = useRef<string | null>(null);
	useEffect(() => {
		const entity = searchParams?.get("expiryEntity");
		const id = searchParams?.get("expiryId");
		if ((entity !== "contract" && entity !== "license") || !id) {
			handledExpiryDeepLinkRef.current = null;
			return;
		}
		if (entity === "contract" && !contractsFromApi?.length) return;

		const key = `${entity}:${id}`;
		if (handledExpiryDeepLinkRef.current === key) return;

		const opened = openForEntityId(entity, id);
		if (opened || entity === "license") {
			handledExpiryDeepLinkRef.current = key;
			const next = new URLSearchParams(searchParams?.toString() ?? "");
			next.delete("expiryEntity");
			next.delete("expiryId");
			const qs = next.toString();
			// Stay on the role home path — replace to `/dashboard` would redirect
			// again and remount this tree, wiping resumeIndex / open state.
			const home = pathname || "/dashboard";
			router.replace(qs ? `${home}?${qs}` : home, { scroll: false });
		}
	}, [searchParams, contractsFromApi, openForEntityId, router, pathname]);

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
					department:
						typeof invitationData.department === "string"
							? invitationData.department
							: typeof created.department === "string"
								? created.department
								: undefined,
					division:
						typeof invitationData.division === "string"
							? invitationData.division
							: typeof created.division === "string"
								? created.division
								: undefined,
					invitedBy:
						typeof invitationData.invitedBy === "string"
							? invitationData.invitedBy
							: typeof created.invitedBy === "string"
								? created.invitedBy
								: undefined,
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
		await removeInvitation(token);
		try {
			const response = await fetch(`/api/invitations/${token}/revoke`, {
				method: "PUT",
			});

			if (!response.ok) {
				throw new Error("Failed to revoke invitation");
			}

			await refreshDashboardInvitations();
			await refreshUninvited(fetchUninvitedUsers(true), { revalidate: false });
			// Keep the row gone even if a stale server cache briefly returns it.
			await removeInvitation(token);
		} catch (error) {
			console.error("Failed to revoke invitation:", error);
			await refreshUnified(undefined, { revalidate: true });
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

	const executiveComplianceTone = complianceMetricTone(
		dashboardStats.complianceRate,
	);
	const executiveNeedReview = complianceNeedReviewCount(
		dashboardStats.totalContracts,
		dashboardStats.complianceRate,
	);
	const expiringSoonCount = dashboardStats.expiringContracts ?? 0;
	const totalContracts = dashboardStats.totalContracts ?? 0;
	const statusBreakdown = dashboardStats.statusBreakdown ?? {
		active: 0,
		draft: 0,
		expired: 0,
	};
	const userComposition = dashboardStats.userComposition ?? {
		superAdmin: 0,
		orgAdmin: 0,
		deptManager: 0,
		unassigned: 0,
		inactive: 0,
		addedThisMonth: 0,
	};
	const compliancePct = parseMetricPercent(dashboardStats.complianceRate) ?? 0;
	const usersAddedThisMonth = userComposition.addedThisMonth;
	// Count-ups mount only after the grid is scrolled into the main viewport
	// (react-countup enableScrollSpy still starts on mount — do not rely on it).
	const { ref: statsInViewRef, ready: statsInView } = useInViewReady(
		unifiedLoading
			? "stats-loading"
			: `stats-${totalContracts}-${expiringSoonCount}-${dashboardStats.activeUsers ?? 0}-${compliancePct}`,
	);

	const slaStatCards = [
		{
			title: "Open approvals",
			value: slaMetrics?.openItems?.toString() ?? "—",
			hint: "Live steps only; expired docs excluded",
		},
		{
			title: "SLA breached",
			value: slaMetrics?.breached?.toString() ?? "—",
			hint:
				slaMetrics?.breachRate != null
					? `${slaMetrics.breachRate}% of open steps`
					: "Past the due time",
		},
		{
			title: "Need explanation",
			value: accountability?.pending?.toString() ?? "—",
			hint:
				accountability?.overduePending != null
					? `${accountability.overduePending} overdue attestations`
					: "Expiration attestations pending",
		},
		{
			title: "Unintentional expirations",
			value:
				expiration?.unintentionalRate != null
					? `${expiration.unintentionalRate}%`
					: "—",
			hint: "Last 30 days; intentional pre-declarations excluded",
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

	const executeResendInvitation = async (token: string) => {
		const response = await fetch(`/api/invitations/${token}/resend`, {
			method: "POST",
		});
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				(typeof errorData.error === "string" && errorData.error) ||
					"Failed to resend invitation",
			);
		}
	};

	const executeDeleteInvitation = async (token: string) => {
		await removeInvitation(token);
		try {
			await deleteInvitation(token);
			await refreshUnified(undefined, { revalidate: true });
			await removeInvitation(token);
		} catch (error) {
			await refreshUnified(undefined, { revalidate: true });
			throw error;
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
				onParkSession={parkModal}
				initialIndex={resumeIndex}
				shouldPlaySpeech={shouldPlaySpeech}
			/>
			{parkedSession && !isModalOpen && (
				<button
					type="button"
					onClick={resumeParkedSession}
					className="fixed bottom-6 right-6 z-50 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#0f5384]/20 bg-white px-4 py-2.5 text-sm font-semibold text-[#0f5384] shadow-lg transition-colors hover:bg-[#F1F9FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				>
					Resume expiry alerts
					<span className="rounded-full bg-[#0f5384]/10 px-2 py-0.5 text-xs tabular-nums">
						{parkedSession.count}
					</span>
				</button>
			)}
			{/* Main Content Container */}
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<motion.div {...revealSolo(softRise)}>
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
									{showDevExpiryTest && (
										<Button
											onClick={triggerDevTestModal}
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
									{showDemoExpiryTest && (
										<Button
											onClick={triggerDemoTestModal}
											variant="outline"
											size="sm"
											className={cn(
												"h-9 gap-2 border border-dashed border-blue/40 bg-blue/10",
												"px-3 text-xs font-medium text-blue hover:bg-blue/15 hover:border-blue/50",
											)}
										>
											<span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue">
												Demo
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
				</motion.div>
				<motion.div {...revealSolo(fadeUp)}>
					<RiskImpactHeroCard
						snapshot={riskImpact}
						isLoading={unifiedLoading}
						error={null}
						onRetry={() => refreshUnified()}
					/>
				</motion.div>
				{/* Stats Grid — count-up + cascade when scrolled into view */}
				<motion.div
					{...revealStagger}
					ref={statsInViewRef}
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
				>
					{unifiedLoading ? (
						[1, 2, 3, 4].map((index) => (
							<motion.div key={index} {...revealItem(scaleIn)}>
								<StatCardSkeleton />
							</motion.div>
						))
					) : (
						<>
							<motion.div {...revealItem(scaleIn)}>
								<MetricStatCard
									title="Total Contracts"
									backdrop="radial"
									value={
										reduceMotion ? (
											totalContracts
										) : !statsInView ? (
											0
										) : (
											<CountUp
												key={`contracts-${totalContracts}`}
												end={totalContracts}
												duration={1.2}
												preserveValue
											/>
										)
									}
									description="Across all departments"
									icon={FileText}
									footer={
										<MetricSegmentBar
											segments={[
												{
													key: "active",
													label: "Active",
													count: statusBreakdown.active,
													colorClass: "bg-green",
													textClass: "text-green",
												},
												{
													key: "draft",
													label: "Draft",
													count: statusBreakdown.draft,
													colorClass: "bg-orange",
													textClass: "text-orange",
												},
												{
													key: "expired",
													label: "Expired",
													count: statusBreakdown.expired,
													colorClass: "bg-slate-300",
													textClass: "text-slate-500",
												},
											]}
										/>
									}
								/>
							</motion.div>
							<motion.div {...revealItem(scaleIn)}>
								<MetricStatCard
									title="Expiring Soon"
									backdrop="wave"
									value={
										reduceMotion ? (
											expiringSoonCount
										) : !statsInView ? (
											0
										) : (
											<CountUp
												key={`expiring-${expiringSoonCount}`}
												end={expiringSoonCount}
												duration={1.2}
												preserveValue
											/>
										)
									}
									description="Within 30 days"
									icon={AlertTriangle}
									iconTone={expiringSoonCount > 0 ? "warning" : "default"}
									dynamicIcon={expiringSoonCount > 0 ? Clock : undefined}
									dynamicTone="warning"
									valueTone={expiringSoonCount > 0 ? "warning" : "default"}
									footer={
										expiringSoonCount === 0 ? (
											<div className="space-y-2">
												<MetricFlatSparkline tone="success" />
												<p className="text-[11px] leading-snug text-slate-500">
													{totalContracts} contract
													{totalContracts === 1 ? "" : "s"} monitored — none
													approaching expiry
												</p>
											</div>
										) : (
											<p className="text-[11px] leading-snug text-orange">
												{expiringSoonCount} of {totalContracts} contract
												{totalContracts === 1 ? "" : "s"} within 30 days
											</p>
										)
									}
								/>
							</motion.div>
							<motion.div {...revealItem(scaleIn)}>
								<MetricStatCard
									title="Active users"
									backdrop="radial"
									value={
										reduceMotion ? (
											(dashboardStats.activeUsers ?? 0)
										) : !statsInView ? (
											0
										) : (
											<CountUp
												key={`users-${dashboardStats.activeUsers ?? 0}`}
												end={dashboardStats.activeUsers ?? 0}
												duration={1.2}
												preserveValue
											/>
										)
									}
									description={
										usersAddedThisMonth > 0
											? `Active accounts in this organization · +${usersAddedThisMonth} this month`
											: "Active accounts in this organization"
									}
									icon={Users}
									headerHref="/dashboard/user-management"
									headerHrefLabel="Open user management"
									headerHrefIcon={SquareArrowOutUpRight}
									footer={
										<MetricSegmentBar
											legendMuted
											segments={[
												{
													key: "super",
													label: "Super Admin",
													count: userComposition.superAdmin,
													colorClass: "bg-[#0f5384]",
													textClass: "text-slate-500",
												},
												{
													key: "org",
													label: "Org Admin",
													count: userComposition.orgAdmin,
													colorClass: "bg-[#078FAB]",
													textClass: "text-slate-500",
												},
												{
													key: "dept",
													label: "Dept Manager",
													count: userComposition.deptManager,
													colorClass: "bg-blue",
													textClass: "text-slate-500",
												},
												...(userComposition.unassigned > 0
													? [
															{
																key: "unassigned",
																label: "Unassigned",
																count: userComposition.unassigned,
																colorClass: "bg-light-200",
																textClass: "text-slate-500",
															},
														]
													: []),
												{
													key: "inactive",
													label: "Inactive",
													count: userComposition.inactive,
													colorClass: "bg-orange",
													textClass: "text-slate-500",
												},
											]}
										/>
									}
								/>
							</motion.div>
							<motion.div {...revealItem(scaleIn)}>
								<MetricStatCard
									title="Compliance Rate"
									backdrop="wave"
									value={
										reduceMotion ? (
											dashboardStats.complianceRate || "0%"
										) : !statsInView ? (
											"0%"
										) : (
											<>
												<CountUp
													key={`compliance-${compliancePct}`}
													end={compliancePct}
													duration={1.2}
													preserveValue
												/>
												%
											</>
										)
									}
									description={
										executiveNeedReview != null
											? `${executiveNeedReview} of ${totalContracts} contracts need review`
											: "Active contracts vs total"
									}
									icon={
										executiveComplianceTone === "danger"
											? ClipboardCheck
											: CheckCircle
									}
									iconTone={executiveComplianceTone}
									titleTone={
										executiveComplianceTone === "danger" ? "danger" : "default"
									}
									borderTone={
										executiveComplianceTone === "danger" ? "danger" : "default"
									}
									dynamicIcon={
										executiveComplianceTone === "danger"
											? AlertCircle
											: CheckCircle
									}
									dynamicTone={executiveComplianceTone}
									valueTone={executiveComplianceTone}
									interactive={executiveComplianceTone === "danger"}
									onClick={
										executiveComplianceTone === "danger"
											? () => router.push("/contracts")
											: undefined
									}
									footer={
										<div className="space-y-2.5">
											<div className="flex items-center gap-3">
												<MetricProgressRing
													percent={compliancePct}
													tone={executiveComplianceTone}
												/>
												<p
													className={cn(
														"text-[11px] leading-snug",
														executiveComplianceTone === "danger"
															? "text-red"
															: "text-slate-500",
													)}
												>
													{executiveComplianceTone === "danger"
														? "Most contracts are past their last compliance check."
														: "Share of contracts marked up to date."}
												</p>
											</div>
											{executiveComplianceTone === "danger" ? (
												<MetricReviewLink href="/contracts">
													Review flagged contracts
												</MetricReviewLink>
											) : null}
										</div>
									}
								/>
							</motion.div>
						</>
					)}
				</motion.div>

				<motion.div {...revealSolo(fadeUp)}>
					<Card className="glass-card mb-6 overflow-visible">
						<div className="glass-card-cap" />
						<CardContent className="relative p-3 sm:p-4 lg:p-6">
							<WidgetCarousel ariaLabel="Executive dashboard widgets">
								{carouselReady ? (
									<>
										<DepartmentPerformanceWidget
											data={bundle ? (bundle.performance ?? null) : undefined}
										/>
										<ContractExpiryAlertsWidget
											maxVisible={2}
											showSettings={false}
											compact={true}
											contracts={contractsFromApi}
											syncExpiredOnMount={false}
											alarmEnabled={!isModalOpen}
										/>
										<LicenseExpiryAlertsWidget
											maxVisible={2}
											showSettings={false}
											compact={true}
											licenses={dashboardLicenses}
											syncExpiredOnMount={false}
											alarmEnabled={!isModalOpen}
										/>
										<ContractStatusPieChart contracts={contractsFromApi} />
										<LicenseStatusPieChart licenses={dashboardLicenses} />
										<CompanyNewsFeed
											items={bundle?.newsItems}
											total={bundle?.newsTotal}
											viewer={bundle?.newsViewer}
											parentLoading={bundleLoading}
										/>
										<QuickNotesWidget
											user={user ?? undefined}
											initialNotes={bundle?.notes}
										/>
									</>
								) : (
									Array.from({ length: 7 }, (_, index) => (
										<StatCardSkeleton key={`widget-skel-${index}`} />
									))
								)}
							</WidgetCarousel>
						</CardContent>
					</Card>
				</motion.div>

				{/* Dashboard Content */}
				<div className="relative z-10 py-8">
					<div className="space-y-6">
						<motion.div
							{...revealStagger}
							className="grid items-stretch gap-6 lg:grid-cols-6"
						>
							<motion.div {...revealItem(fadeLeft)} className="lg:col-span-3">
								<RecentActivity
									limit={10}
									activities={recentActivities as never}
									parentLoading={unifiedLoading}
								/>
							</motion.div>

							<motion.div
								{...revealItem(fadeRight)}
								className="flex h-full min-h-0 min-w-0 lg:col-span-3"
							>
								<Card className="glass-card relative flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden">
									<div className="glass-card-cap" />
									<MetricStatDotsBackdrop />
									<CardHeader className="relative z-10 mb-1 border-b border-slate-200/80 pb-4">
										<CardTitle className="flex items-center gap-2.5 text-lg font-bold sidebar-gradient-text">
											<StatCardIcon icon={CalendarDays} />
											Calendar
										</CardTitle>
									</CardHeader>
									<CardContent className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2 sm:px-4 sm:pb-4 md:px-6 md:pb-6">
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
							</motion.div>
						</motion.div>

						{/* Recent files uploaded and Pending Approvals */}
						<motion.div
							{...revealStagger}
							className="grid lg:grid-cols-2 gap-6"
						>
							<motion.div {...revealItem(fadeLeft)}>
								<RecentFilesUploadedCard
									className="glass-card h-full"
									files={files as RecentFileItem[]}
									isLoading={unifiedLoading}
									limit={10}
								/>
							</motion.div>

							{/* Approval SLA accountability */}
							<motion.div {...revealItem(fadeRight)}>
								<Card className="glass-card relative flex h-full flex-col overflow-hidden">
									<div className="glass-card-cap" />
									<MetricStatDotsBackdrop />
									<CardHeader className="relative z-10 mb-4 border-b border-slate-200/80 pb-4">
										<CardTitle className="flex items-center gap-2.5 text-lg font-bold sidebar-gradient-text">
											<StatCardIcon icon={Clock} />
											Approvals & Expirations
										</CardTitle>
									</CardHeader>
									<CardContent className="relative z-10 flex flex-1 flex-col">
										<div className="flex flex-1 flex-col gap-3">
											{slaStatCards.map((stat) => (
												<div
													key={stat.title}
													className="bg-white/20 backdrop-blur-md border border-white/30 rounded-lg p-3 shadow-sm"
												>
													<div className="flex items-center justify-between gap-3">
														<div>
															<p className="text-sm font-medium text-slate-700">
																{stat.title}
															</p>
															<p className="text-xs text-slate-500 mt-0.5">
																{stat.hint}
															</p>
														</div>
														<p className="text-lg text-slate-700 tabular-nums">
															{stat.value}
														</p>
													</div>
												</div>
											))}
											<div className="mt-auto flex items-center justify-end gap-3">
												<Button asChild className={`${cta} flex-1`}>
													<Link href="/analytics?tab=portfolio">
														<BarChart3 className="h-4 w-4" />
														Open portfolio analytics
													</Link>
												</Button>
												<Button asChild className={`${cta} flex-1`}>
													<Link href="/contracts/approvals">
														<ClipboardList className="h-4 w-4" />
														Open approvals
													</Link>
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						</motion.div>

						{/* Invitation Management Section */}
						<motion.div {...revealStagger} className="space-y-6">
							<motion.div {...revealItem(fadeUp)}>
								<Card className="glass-card relative overflow-hidden">
									<div className="glass-card-cap" />
									<MetricStatDotsBackdrop />
									{/* Header */}
									<div className="relative z-10 border-b border-slate-200/80 px-5 py-5 sm:px-6">
										<h2 className="flex items-center gap-2.5 mt-1 text-xl font-bold tracking-tight sidebar-gradient-text">
											<StatCardIcon icon={LinkIcon} />
											Send Invite Link
										</h2>
										<p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">
											Grant a new person access to CAALM by selecting their
											identity and access level below.
										</p>
									</div>

									<form onSubmit={handleInviteSubmit} className="relative z-10">
										<div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
											<div className="flex items-start gap-4">
												<div className="min-w-0 flex-[1.2]">
													<p className="mb-4 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">
														Recipient
													</p>
													<label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold leading-none text-slate-700">
														Select a user
														<span className="font-bold text-red" aria-hidden>
															*
														</span>
													</label>
													<div className="flex items-end gap-2">
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
																					{inviteUser.fullName} (
																					{inviteUser.email})
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
																className={cn(
																	"h-4 w-4",
																	refreshLoading && "animate-spin",
																)}
															/>
														</Button>
													</div>
												</div>

												<div
													className="mt-1 w-px shrink-0 self-stretch bg-slate-200"
													aria-hidden
												/>

												<div className="min-w-0 flex-[2.4]">
													<p className="mb-4 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">
														Access &amp; permissions
													</p>
													<div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1fr)] items-start gap-3">
														<div className="min-w-0">
															<label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold leading-none text-slate-700">
																Role
																<span
																	className="font-bold text-red"
																	aria-hidden
																>
																	*
																</span>
															</label>
															<SelectScrollable
																value={inviteForm.role}
																onValueChange={(value) =>
																	setInviteForm((prev) => ({
																		...prev,
																		role: value,
																	}))
																}
																placeholder="Select role…"
																className="w-full border-[0.25px] border-slate-200 bg-white text-slate-700 shadow-sm"
															>
																<SelectItem value="Super Admin">
																	Super Admin
																</SelectItem>
																<SelectItem value="Organization Admin">
																	Organization Admin
																</SelectItem>
																<SelectItem value="Executive">
																	Executive
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
																setInviteForm((prev) => ({
																	...prev,
																	division: value,
																}))
															}
														/>
													</div>
												</div>
											</div>
											<p className="mt-2 text-[11px] text-slate-500">
												User list comes from your connected directory. Division
												is optional.
											</p>
											{(uninvitedUsers as UninvitedUser[]).length === 0 && (
												<p className="mt-2 text-xs text-slate-500">
													No Auth users are waiting for an invite. Everyone
													either has a role or already has a pending invitation.
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
												className={`${cta} shrink-0`}
											>
												<Send className="h-3.5 w-3.5" />
												{loading ? "Sending…" : "Send invite"}
											</Button>
										</div>
									</form>
								</Card>
							</motion.div>

							<motion.div {...revealItem(softRise)}>
								<PendingInvitationsCard
									invitations={
										(invitations as PendingInvitationRow[]) ?? []
									}
									isLoading={unifiedLoading}
									addingTokens={addingInvitations}
									onResend={executeResendInvitation}
									onRevoke={revokeInvitation}
									onDelete={executeDeleteInvitation}
									variant="executive"
								/>
							</motion.div>
						</motion.div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ExecutiveDashboard;

// Overlay notifier at root of dashboard
// Note: Place after export if using layout; otherwise render inside JSX above.
// Here we render inside the component tree at the top-level container.
