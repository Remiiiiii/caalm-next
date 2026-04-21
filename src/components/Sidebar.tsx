"use client";

import { Building, Building2, Cloud, Crown, Eye, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, memo, useEffect, useMemo, useState } from "react";
import ITSidebar from "@/components/ITSidebar";
import StorageProgressBar from "@/components/StorageProgressBar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	hasNavigationPermission,
	type NavigationItem,
	PERMISSION_BASED_NAV,
} from "@/constants/navigation-permissions";
import type { PermissionKey } from "@/constants/permissions";
import { PERMISSIONS } from "@/constants/permissions";
import { useAnalyticsPrefetch } from "@/hooks/useAnalyticsPrefetch";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRoles } from "@/hooks/useUserRoles";
import { cn } from "@/lib/utils";

interface TotalSpace {
	document: { size: number; latestDate: string };
	image: { size: number; latestDate: string };
	video: { size: number; latestDate: string };
	audio: { size: number; latestDate: string };
	other: { size: number; latestDate: string };
	used: number;
	all: number;
}

interface Props {
	name?: string;
	avatar?: string;
	email: string;
	role?: string; // Legacy role for backward compatibility
	division?: string;
}

// Memoized icon component for fast rendering
const SidebarIcon = memo(
	({
		src,
		alt,
		width,
		height,
		priority = false,
	}: {
		src: string;
		alt: string;
		width: number;
		height: number;
		priority?: boolean;
	}) => (
		<Image
			src={src}
			alt={alt}
			width={width}
			height={height}
			priority={priority}
			fetchPriority={priority ? "high" : "auto"}
			loading={priority ? undefined : "lazy"}
			className="flex-shrink-0 max-w-none"
			style={{ width: "auto", height: `${height}px` }}
		/>
	),
);
SidebarIcon.displayName = "SidebarIcon";

// Icon mapping for faster lookups
const SECTION_ICONS: Record<
	string,
	{ src: string; width: number; height: number }
> = {
	Calendar: { src: "/assets/icons/calendar2.svg", width: 24, height: 24 },
	Contracts: { src: "/assets/icons/contracts.svg", width: 30, height: 30 },
	Licenses: { src: "/assets/icons/license.svg", width: 28, height: 28 },
	Documents: { src: "/assets/icons/documents.svg", width: 24, height: 24 },
	Audits: { src: "/assets/icons/audit.svg", width: 28, height: 28 },
	Team: { src: "/assets/icons/team.svg", width: 28, height: 28 },
	"Reports & Analytics": {
		src: "/assets/icons/reports-analytics.svg",
		width: 28,
		height: 28,
	},
	Settings: { src: "/assets/icons/settings.svg", width: 28, height: 28 },
	"My Roles & Permissions": {
		src: "/assets/icons/shield.svg",
		width: 24,
		height: 24,
	},
};

const ITEM_ICONS: Record<
	string,
	{ src: string; width: number; height: number }
> = {
	"All Contracts": {
		src: "/assets/icons/all-contracts.svg",
		width: 20,
		height: 20,
	},
	"My Contracts": {
		src: "/assets/icons/my-contracts.svg",
		width: 20,
		height: 18,
	},
	"Advanced Resources": {
		src: "/assets/icons/resources.svg",
		width: 20,
		height: 20,
	},
	"Proposals & Approvals": {
		src: "/assets/icons/proposal-approval.svg",
		width: 20,
		height: 20,
	},
	"All Licenses": { src: "/assets/icons/licenses.svg", width: 25, height: 25 },
	"Department Licenses": {
		src: "/assets/icons/dept-license.svg",
		width: 20,
		height: 20,
	},
	Uploads: { src: "/assets/icons/uploads.svg", width: 20, height: 20 },
	Images: { src: "/assets/icons/images.svg", width: 20, height: 20 },
	Media: { src: "/assets/icons/media.svg", width: 20, height: 20 },
	Others: { src: "/assets/icons/others.svg", width: 20, height: 20 },
	"Compliance Status": {
		src: "/assets/icons/compliance-status.svg",
		width: 20,
		height: 20,
	},
	"Audit Logs": { src: "/assets/icons/audit-logs.svg", width: 20, height: 20 },
	"User Management": {
		src: "/assets/icons/user-management.svg",
		width: 20,
		height: 20,
	},
	"Role Management": {
		src: "/assets/icons/user-management2.svg",
		width: 20,
		height: 20,
	},
	"Calendar View": {
		src: "/assets/icons/calendar3.svg",
		width: 20,
		height: 20,
	},
	"Training & Certifications": {
		src: "/assets/icons/training-cert.svg",
		width: 20,
		height: 20,
	},
	"Assign Tasks": { src: "/assets/icons/task.svg", width: 20, height: 20 },
	Overview: { src: "/assets/icons/analytics.svg", width: 20, height: 20 },
	"Quick View": { src: "/assets/icons/analytics.svg", width: 20, height: 20 },
	"C Suite": { src: "/assets/icons/analytics.svg", width: 20, height: 20 },
	"C-Suite": { src: "/assets/icons/analytics.svg", width: 20, height: 20 },
	"System Settings": {
		src: "/assets/icons/settings2.svg",
		width: 20,
		height: 20,
	},
	"Organization Settings": {
		src: "/assets/icons/settings2.svg",
		width: 20,
		height: 20,
	},
	"Billing & Integrations": {
		src: "/assets/icons/settings2.svg",
		width: 20,
		height: 20,
	},
	"View My Access": { src: "/assets/icons/key.svg", width: 20, height: 20 },
	Logs: {
		src: "/assets/icons/audit-logs.svg",
		width: 20,
		height: 20,
	},
};

const Sidebar = memo(({ name, avatar, email, role, division }: Props) => {
	// CRITICAL: ALL HOOKS MUST BE CALLED UNCONDITIONALLY BEFORE ANY RETURNS
	const [totalSpace, setTotalSpace] = useState<TotalSpace | null>(null);
	const router = useRouter();
	const pathname = usePathname();
	const { prefetchDepartmentAnalytics } = useAnalyticsPrefetch();
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { roles: userRoles, loading: rolesLoading } = useUserRoles();

	// Fetch storage data
	useEffect(() => {
		async function fetchTotalSpace() {
			try {
				const response = await fetch("/api/storage/usage");
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const space = await response.json();
				setTotalSpace(space);
			} catch (error) {
				console.error("Failed to fetch total space:", error);
				// Set default empty space on error
				setTotalSpace({
					document: { size: 0, latestDate: "" },
					image: { size: 0, latestDate: "" },
					video: { size: 0, latestDate: "" },
					audio: { size: 0, latestDate: "" },
					other: { size: 0, latestDate: "" },
					used: 0,
					all: 2 * 1024 * 1024 * 1024,
				});
			}
		}
		fetchTotalSpace();
		// Refresh storage data every 30 seconds
		const interval = setInterval(fetchTotalSpace, 30000);
		return () => clearInterval(interval);
	}, []);

	// Preload critical icons on mount
	useEffect(() => {
		const criticalIcons = [
			"/assets/icons/calendar2.svg",
			"/assets/icons/contracts.svg",
			"/assets/icons/documents.svg",
			"/assets/icons/settings.svg",
		];

		criticalIcons.forEach((icon) => {
			const link = document.createElement("link");
			link.rel = "preload";
			link.as = "image";
			link.href = icon;
			document.head.appendChild(link);
		});
	}, []);

	const performHardRefresh = () => {
		window.location.reload();
	};

	// Function for button click
	const handleButtonClick = () => {
		handleKeyDown(
			new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "R" }),
		);
	};

	// Function for keyboard shortcut
	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.ctrlKey && event.shiftKey && event.key === "R") {
			event.preventDefault();
			performHardRefresh();
		}
	};

	// Add keyboard event listener
	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	// Memoize viewer check and primary role to avoid unnecessary recalculations
	const { isViewer, primaryRole, isITUser } = useMemo(() => {
		if (userRoles.length === 0) {
			return { isViewer: false, primaryRole: null, isITUser: false };
		}
		const viewerRole = userRoles.find((r) => r.roleName === "Viewer");
		const itRole = userRoles.find((r) => r.roleName === "IT");
		return {
			isViewer: !!viewerRole,
			primaryRole: userRoles[0]?.roleName || null,
			isITUser: !!itRole,
		};
	}, [userRoles]);

	// Get role badge icon component
	// const getRoleBadgeIcon = (roleName: string | null) => {
	//   if (!roleName) return null;
	//   const iconProps = { className: 'h-4 w-4', 'aria-hidden': true };
	//   switch (roleName) {
	//     case 'Super Admin':
	//       return <Crown {...iconProps} className="h-4 w-4 text-yellow-500" />;
	//     case 'Organization Admin':
	//       return <Building2 {...iconProps} className="h-4 w-4 text-blue-500" />;
	//     case 'Department Manager':
	//       return <Building {...iconProps} className="h-4 w-4 text-green-500" />;
	//     case 'Viewer':
	//       return <Eye {...iconProps} className="h-4 w-4 text-gray-500" />;
	//     default:
	//       return null;
	//   }
	// };

	// Map database division values to sidebar division values
	const mapDivisionToSidebar = (dbDivision?: string): string | undefined => {
		if (!dbDivision) return undefined;

		const divisionMap: Record<string, string> = {
			"child-welfare": "child-welfare",
			"behavioral-health": "behavioral-health",
			clinic: "clinic",
			residential: "residential",
			cfs: "cfs",
			hr: "hr",
			"c-suite": "c-suite",
			managerial: "management",
			finance: "finance",
			operations: "operations",
		};

		return divisionMap[dbDivision] || dbDivision;
	};

	const _mappedDivision = mapDivisionToSidebar(division);

	// Memoize lock check function to avoid recreating on every render
	const shouldShowLock = useMemo(
		() =>
			(item: NavigationItem): boolean => {
				if (!item.requiresElevated) return false;
				// Show lock if requires elevated permission and user doesn't have it
				return !hasNavigationPermission(permissions, item);
			},
		[permissions],
	);

	// Build navigation based on permissions
	// Show navigation immediately if we have any data (cached or fresh)
	// Only return empty array if we're truly loading with no data
	const groupedNav = useMemo(() => {
		// If we have permissions or roles data, build nav even if still loading in background
		const hasData = permissions.length > 0 || userRoles.length > 0;
		const isInitialLoad = permissionsLoading && rolesLoading && !hasData;

		if (isInitialLoad) {
			return [];
		}

		const nav: typeof PERMISSION_BASED_NAV = [];

		// Dashboard section - dynamically generate based on user's actual roles
		const dashboardItems: Array<{
			name: string;
			icon: string;
			url: string;
			permissions: PermissionKey[];
		}> = [];

		// Map role names to dashboard URLs
		const roleToDashboardMap: Record<
			string,
			{ url: string; permissions: PermissionKey[] }
		> = {
			"Super Admin": {
				url: "/dashboard/superadmin",
				permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
			},
			"Organization Admin": {
				url: "/dashboard/organizationadmin",
				permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
			},
			"Department Manager": {
				url: "/dashboard/departmentmanager",
				permissions: [
					PERMISSIONS.CALENDAR.VIEW_TEAM,
					PERMISSIONS.CONTRACTS.VIEW,
				],
			},
			Viewer: {
				url: "/dashboard/viewer",
				permissions: [
					PERMISSIONS.CALENDAR.VIEW_OWN,
					PERMISSIONS.CONTRACTS.VIEW,
				],
			},
			IT: {
				url: "/dashboard/it",
				permissions: [PERMISSIONS.IT.VIEW_MONITORING],
			},
		};

		// Generate dashboard items from user's actual roles
		const seenUrls = new Set<string>();
		userRoles.forEach((userRole) => {
			if (userRole.roleName) {
				const dashboardConfig = roleToDashboardMap[userRole.roleName];
				if (dashboardConfig && !seenUrls.has(dashboardConfig.url)) {
					// Check if user has required permissions
					const hasAccess = dashboardConfig.permissions.some((perm) =>
						permissions.includes(perm),
					);

					if (hasAccess) {
						seenUrls.add(dashboardConfig.url);
						dashboardItems.push({
							name: userRole.roleName,
							icon: "/assets/icons/dashboard.svg",
							url: dashboardConfig.url,
							permissions: dashboardConfig.permissions,
						});
					}
				}
			}
		});

		// Fallback: if no roles found, use permission-based access (for backward compatibility)
		if (dashboardItems.length === 0 && !rolesLoading) {
			const fallbackDashboardItems =
				PERMISSION_BASED_NAV.find((s) => s.header === "Dashboard")?.items || [];
			const accessibleDashboards = fallbackDashboardItems.filter((item) =>
				hasNavigationPermission(permissions, item),
			);

			// Replace hardcoded names with generic "Dashboard" if needed
			accessibleDashboards.forEach((item) => {
				if (!seenUrls.has(item.url)) {
					seenUrls.add(item.url);
					dashboardItems.push(item);
				}
			});
		}

		if (dashboardItems.length > 0) {
			nav.push({
				header: "Dashboard",
				items: dashboardItems,
			});
		}

		// Helper function to filter items based on role visibility
		const filterItemsByRole = (items: NavigationItem[]): NavigationItem[] => {
			return items.filter((item) => {
				// Check if item should be hidden for user's role
				if (item.hiddenForRoles && primaryRole) {
					if (item.hiddenForRoles.includes(primaryRole)) {
						return false;
					}
				}
				return true;
			});
		};

		// Calendar section
		const calendarItems =
			PERMISSION_BASED_NAV.find((s) => s.header === "Calendar")?.items || [];
		const accessibleCalendar = filterItemsByRole(
			calendarItems.filter((item) =>
				hasNavigationPermission(permissions, item),
			),
		);

		if (accessibleCalendar.length > 0) {
			nav.push({
				header: "Calendar",
				items: accessibleCalendar,
			});
		}

		// Contracts section
		const contractItems =
			PERMISSION_BASED_NAV.find((s) => s.header === "Contracts")?.items || [];
		const accessibleContracts = filterItemsByRole(
			contractItems.filter((item) =>
				hasNavigationPermission(permissions, item),
			),
		);

		if (accessibleContracts.length > 0) {
			nav.push({
				header: "Contracts",
				items: accessibleContracts,
			});
		}

		// Licenses section
		const licenseItems =
			PERMISSION_BASED_NAV.find((s) => s.header === "Licenses")?.items || [];
		const accessibleLicenses = filterItemsByRole(
			licenseItems.filter((item) => hasNavigationPermission(permissions, item)),
		);

		if (accessibleLicenses.length > 0) {
			nav.push({
				header: "Licenses",
				items: accessibleLicenses,
			});
		}

		// Documents section
		const documentItems =
			PERMISSION_BASED_NAV.find((s) => s.header === "Documents")?.items || [];
		const accessibleDocuments = filterItemsByRole(
			documentItems.filter((item) =>
				hasNavigationPermission(permissions, item),
			),
		);

		if (accessibleDocuments.length > 0) {
			nav.push({
				header: "Documents",
				items: accessibleDocuments,
			});
		}

		// Audits section
		const auditItems =
			PERMISSION_BASED_NAV.find((s) => s.header === "Audits")?.items || [];
		const accessibleAudits = filterItemsByRole(
			auditItems.filter((item) => hasNavigationPermission(permissions, item)),
		);

		if (accessibleAudits.length > 0) {
			nav.push({
				header: "Audits",
				items: accessibleAudits,
			});
		}

		// Team section
		const teamItems =
			PERMISSION_BASED_NAV.find((s) => s.header === "Team")?.items || [];
		const accessibleTeam = filterItemsByRole(
			teamItems.filter((item) => hasNavigationPermission(permissions, item)),
		);

		if (accessibleTeam.length > 0) {
			nav.push({
				header: "Team",
				items: accessibleTeam,
			});
		}

		// Reports & Analytics section
		const analyticsItems =
			PERMISSION_BASED_NAV.find((s) => s.header === "Reports & Analytics")
				?.items || [];
		const accessibleAnalytics = filterItemsByRole(
			analyticsItems.filter((item) =>
				hasNavigationPermission(permissions, item),
			),
		);

		if (accessibleAnalytics.length > 0) {
			nav.push({
				header: "Reports & Analytics",
				items: accessibleAnalytics,
			});
		}

		// Settings section
		const settingsItems =
			PERMISSION_BASED_NAV.find((s) => s.header === "Settings")?.items || [];
		const accessibleSettings = filterItemsByRole(
			settingsItems.filter((item) =>
				hasNavigationPermission(permissions, item),
			),
		);

		if (accessibleSettings.length > 0) {
			nav.push({
				header: "Settings",
				items: accessibleSettings,
			});
		}

		// My Roles & Permissions section
		const permissionsItems =
			PERMISSION_BASED_NAV.find((s) => s.header === "My Roles & Permissions")
				?.items || [];
		const accessiblePermissions = permissionsItems.filter((item) =>
			hasNavigationPermission(permissions, item),
		);

		if (accessiblePermissions.length > 0) {
			nav.push({
				header: "My Roles & Permissions",
				items: accessiblePermissions,
			});
		}

		return nav;
	}, [permissions, permissionsLoading, userRoles, rolesLoading, primaryRole]);

	// IMPORTANT: Check for IT user AFTER all hooks have been called
	// This prevents "Rendered fewer hooks" error
	if (isITUser) {
		return <ITSidebar name={name} avatar={avatar} email={email} />;
	}

	return (
		<aside className="sidebar">
			<div className="flex items-center justify-between mb-4">
				<Link href="/" className="dashboard-logo">
					<Image
						src="/assets/images/logo.svg"
						alt="logo"
						fill
						className="object-contain"
						sizes="50px"
						priority
						fetchPriority="high"
					/>
				</Link>

				{/* Hard Refresh Button */}
				<button
					onClick={handleButtonClick}
					className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200 shadow-md hover:shadow-lg"
					title="Hard Refresh (Ctrl+Shift+R)"
					type="button"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
						<path d="M21 3v5h-5" />
						<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
						<path d="M3 21v-5h5" />
					</svg>
				</button>
			</div>
			<nav className="sidebar-nav">
				<ul className="flex flex-1 flex-col">
					{groupedNav.length === 0 && permissionsLoading && rolesLoading ? (
						<li className="text-center py-8 text-muted-foreground">
							<div className="flex flex-col items-center gap-2">
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
								<span className="text-sm">Loading navigation...</span>
							</div>
						</li>
					) : groupedNav.length === 0 ? (
						<li className="text-center py-8 text-muted-foreground">
							No navigation items available
						</li>
					) : (
						groupedNav.map((section) => {
							if (section.items.length === 0) return null;

							return (
								<div key={section.header} className="mb-4">
									<li
										className={cn(
											"sidebar-section-header mb-0 lg:mb-1 font-bold text-lg lg:text-xl",
										)}
									>
										<span className="flex items-center gap-2">
											{section.header === "Dashboard" ? (
												<span className="flex items-center gap-2">
													<span className="text-[#03AFBF]">
														<svg
															width="28"
															height="28"
															viewBox="0 0 26 26"
															fill="none"
															xmlns="http://www.w3.org/2000/svg"
														>
															<path
																d="M10.5167 2.16602H3.74582C2.87467 2.16602 2.16602 2.87467 2.16602 3.74582V7.80832C2.16602 8.67964 2.87467 9.38829 3.74582 9.38829H10.5167C11.388 9.38829 12.0966 8.67964 12.0966 7.80832V3.74582C12.0966 2.87467 11.388 2.16602 10.5167 2.16602ZM10.5167 11.1937H3.74582C2.87467 11.1937 2.16602 11.9024 2.16602 12.7737V22.2529C2.16602 23.124 2.87467 23.8327 3.74582 23.8327H10.5167C11.388 23.8327 12.0966 23.124 12.0966 22.2529V12.7737C12.0966 11.9024 11.388 11.1937 10.5167 11.1937ZM22.2529 16.6104H15.482C14.6107 16.6104 13.9021 17.3191 13.9021 18.1904V22.2529C13.9021 23.124 14.6107 23.8327 15.482 23.8327H22.2529C23.124 23.8327 23.8327 23.124 23.8327 22.2529V18.1904C23.8327 17.3191 23.124 16.6104 22.2529 16.6104ZM22.2529 2.16602H15.482C14.6107 2.16602 13.9021 2.87467 13.9021 3.74582V13.225C13.9021 14.0963 14.6107 14.805 15.482 14.805H22.2529C23.124 14.805 23.8327 14.0963 23.8327 13.225V3.74582C23.8327 2.87467 23.124 2.16602 22.2529 2.16602Z"
																fill="currentColor"
															/>
														</svg>
													</span>
													{primaryRole && (
														<TooltipProvider>
															<Tooltip>
																<TooltipTrigger asChild>
																	{/* <span className="flex items-center">
                                    {getRoleBadgeIcon(primaryRole)}
                                  </span> */}
																</TooltipTrigger>
																<TooltipContent>
																	<p>
																		You have {permissions.length} permissions as{" "}
																		{primaryRole}. View details →
																	</p>
																</TooltipContent>
															</Tooltip>
														</TooltipProvider>
													)}
												</span>
											) : (
												(() => {
													const iconConfig = SECTION_ICONS[section.header];
													if (!iconConfig) return null;
													return (
														<span className="text-[#03AFBF]">
															<SidebarIcon
																src={iconConfig.src}
																alt={section.header.toLowerCase()}
																width={iconConfig.width}
																height={iconConfig.height}
																priority={
																	section.header === "Dashboard" ||
																	section.header === "Calendar"
																}
															/>
														</span>
													);
												})()
											)}
											<span className="font-bold text-base sidebar-gradient-text relative z-10">
												{section.header}
											</span>
										</span>
									</li>
									<div className="relative ml-3">
										<ul className="flex flex-col gap-1 relative z-10">
											{section.items.map((item, index) => (
												<Fragment
													key={`${section.header}-${item.name}-${
														item.url || index
													}`}
												>
													<li className="relative flex items-center">
														{/* Main vertical line for all sections */}
														{index < section.items.length + 1 && (
															<span
																className="absolute left-0 top-0 h-[24px] w-4 border-l border-[#BFBFBF]"
																style={{ zIndex: 0 }}
															></span>
														)}
														<span className="absolute left-0 top-0 h-4 w-4 border-l border-b border-[#BFBFBF] rounded-bl-xl"></span>
														<Link
															href={item.url || ""}
															className="ml-4 w-full flex items-start"
															onMouseEnter={() => {
																// Prefetch analytics data on hover for better performance
																if (item.url?.includes("/analytics")) {
																	router.prefetch(item.url);
																	// Extract department from URL for analytics prefetching
																	const departmentMatch =
																		item.url.match(/\/analytics\/([^/]+)/);
																	if (departmentMatch) {
																		prefetchDepartmentAnalytics(
																			departmentMatch[1],
																		);
																	}
																}
															}}
														>
															{/* Render icons based on item name - Role badges for Dashboard items */}
															{section.header === "Dashboard" && (
																<span className="gap-1s">
																	{item.name === "Super Admin" && (
																		<Crown className="h-5 w-5 text-yellow-500" />
																	)}
																	{item.name === "Organization Admin" && (
																		<Building2 className="h-5 w-5 text-blue-500" />
																	)}
																	{item.name === "Department Manager" && (
																		<Building className="h-5 w-5 text-green-500" />
																	)}
																	{item.name === "Viewer" && (
																		<Eye className="h-5 w-5 text-gray-500" />
																	)}
																</span>
															)}
															{/* {item.name === 'Quick View' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/analytics.svg"
                                    alt="analytics"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )} */}
															{(() => {
																const iconConfig = ITEM_ICONS[item.name];
																if (!iconConfig) return null;
																// Priority for first few items in each section
																const isPriority = index < 3;
																return (
																	<span className="gap-1">
																		<SidebarIcon
																			src={iconConfig.src}
																			alt={item.name.toLowerCase()}
																			width={iconConfig.width}
																			height={iconConfig.height}
																			priority={isPriority}
																		/>
																	</span>
																);
															})()}
															<p
																className={`text-sm text-slate-900 px-2 tabs-underline font-medium flex items-center gap-2 ${
																	item.name === "Admin" ? "-ml-[1px]" : ""
																} ${
																	isViewer && item.viewerReadOnly
																		? "opacity-75"
																		: ""
																}`}
																data-state={
																	pathname &&
																	item.url &&
																	(pathname === item.url ||
																		(pathname.startsWith(`${item.url}/`) &&
																			item.url !== "/analytics"))
																		? "active"
																		: undefined
																}
															>
																<span>{item.name}</span>
																{shouldShowLock(item) && (
																	<TooltipProvider>
																		<Tooltip>
																			<TooltipTrigger asChild>
																				<span className="flex items-center">
																					<Lock className="h-3 w-3 text-gray-500" />
																				</span>
																			</TooltipTrigger>
																			<TooltipContent>
																				<p>
																					This feature requires{" "}
																					{item.permissions
																						.map((p) => p.split(".").pop())
																						.join(" or ")}{" "}
																					permission. Contact your administrator
																					to request access.
																				</p>
																			</TooltipContent>
																		</Tooltip>
																	</TooltipProvider>
																)}
																{isViewer && item.viewerReadOnly && (
																	<TooltipProvider>
																		<Tooltip>
																			<TooltipTrigger asChild>
																				<span className="flex items-center text-xs text-gray-500">
																					(read-only)
																				</span>
																			</TooltipTrigger>
																			<TooltipContent>
																				<p>
																					You have read-only access as an
																					External Auditor. You cannot modify
																					this data.
																				</p>
																			</TooltipContent>
																		</Tooltip>
																	</TooltipProvider>
																)}
															</p>
														</Link>
													</li>
												</Fragment>
											))}
										</ul>
									</div>
								</div>
							);
						})
					)}
				</ul>
			</nav>
			{/* Settings link - only show if Settings section is not in nav */}
			{!groupedNav.some((s) => s.header === "Settings") && (
				<Link href="/settings">
					<div className="flex items-center gap-2 mt-8">
						<SidebarIcon
							src="/assets/icons/settings.svg"
							alt="settings"
							width={25}
							height={25}
							priority
						/>
						<span className="font-bold text-base sidebar-gradient-text">
							Settings
						</span>
					</div>
				</Link>
			)}
			<div className="sidebar-storage-info">
				{/* Storage Section */}
				{totalSpace && (
					<div className="w-full">
						<div className="flex items-center gap-2 mb-2">
							<Cloud className="h-4 w-4 text-slate-700" />
							<p className="caption text-slate-700">Storage</p>
						</div>
						<StorageProgressBar totalSpace={totalSpace} />
					</div>
				)}
			</div>
		</aside>
	);
});

Sidebar.displayName = "Sidebar";

export default Sidebar;
