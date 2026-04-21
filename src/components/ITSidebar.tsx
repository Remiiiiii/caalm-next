/**
 * IT Sidebar Component
 * Specialized sidebar for IT/Software Engineering staff
 * Displays role, department, and IT-specific navigation
 */

"use client";

import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	filterITNavigationByPermissions,
	IT_NAVIGATION,
} from "@/constants/it-navigation";
import { useITUser } from "@/hooks/useITUser";
import { usePermissions } from "@/hooks/usePermissions";
import {
	type ConnectionStatus,
	realtimeService,
} from "@/lib/services/realtime-service";
import { cn } from "@/lib/utils";

interface ITSidebarProps {
	name?: string;
	avatar?: string;
	email: string;
}

const ITSidebar: React.FC<ITSidebarProps> = ({ name, avatar, email }) => {
	const pathname = usePathname();
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { user, loading: userLoading } = useITUser();
	const [realtimeStatus, setRealtimeStatus] = React.useState<ConnectionStatus>(
		realtimeService.getConnectionStatus(),
	);

	// Subscribe to real-time connection status
	React.useEffect(() => {
		const unsubscribe = realtimeService.onStatusChange((status) => {
			setRealtimeStatus(status);
		});

		setRealtimeStatus(realtimeService.getConnectionStatus());

		return unsubscribe;
	}, []);

	// Filter navigation based on permissions
	const filteredNav = useMemo(() => {
		if (permissionsLoading || !permissions.length) {
			return [];
		}
		return filterITNavigationByPermissions(IT_NAVIGATION, permissions);
	}, [permissions, permissionsLoading]);

	// Get connection status indicator
	const getConnectionIndicator = () => {
		switch (realtimeStatus) {
			case "connected":
				return (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 text-green-600">
									<Wifi className="h-3 w-3" />
									<span className="text-xs">Connected</span>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Real-time sync active</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				);
			case "connecting":
				return (
					<div className="flex items-center gap-1 text-yellow-600">
						<Wifi className="h-3 w-3 animate-pulse" />
						<span className="text-xs">Connecting...</span>
					</div>
				);
			case "error":
				return (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 text-red-600">
									<AlertCircle className="h-3 w-3" />
									<span className="text-xs">Error</span>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Real-time sync error. Reconnecting...</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				);
			default:
				return (
					<div className="flex items-center gap-1 text-gray-400">
						<WifiOff className="h-3 w-3" />
						<span className="text-xs">Disconnected</span>
					</div>
				);
		}
	};

	return (
		<aside className="sidebar">
			<div className="flex items-center justify-between mb-4">
				<Link href="/dashboard/it" className="inline-flex shrink-0">
					<Image
						src="/assets/images/logo.svg"
						alt="logo"
						width={42}
						height={42}
						className="hidden h-9 w-9 shrink-0 object-contain lg:block"
						priority
						fetchPriority="high"
					/>
					<Image
						src="/assets/images/logo.svg"
						alt="logo"
						width={42}
						height={42}
						className="h-9 w-9 shrink-0 object-contain lg:hidden"
						priority
						fetchPriority="high"
					/>
				</Link>
			</div>

			{/* User Info Section */}
			<div className="mb-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-slate-200">
				{userLoading ? (
					<div className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
						<div className="flex-1">
							<div className="h-4 w-24 bg-slate-200 animate-pulse rounded mb-1" />
							<div className="h-3 w-32 bg-slate-200 animate-pulse rounded" />
						</div>
					</div>
				) : user ? (
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							{avatar ? (
								<Image
									src={avatar}
									alt={name || "User"}
									width={32}
									height={32}
									className="rounded-full"
								/>
							) : (
								<div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
									{(name || email || "U").charAt(0).toUpperCase()}
								</div>
							)}
							<div className="flex-1 min-w-0">
								<p className="text-sm font-semibold text-slate-900 truncate">
									{name || email}
								</p>
								<p className="text-xs text-slate-600 truncate">{email}</p>
							</div>
						</div>
						<div className="pt-2 border-t border-slate-200 space-y-1">
							<div className="flex items-center justify-between">
								<span className="text-xs text-slate-600">Role:</span>
								<span className="text-xs font-semibold text-[#0f5384]">
									{user.roleName}
								</span>
							</div>
							{user.department && (
								<div className="flex items-center justify-between">
									<span className="text-xs text-slate-600">Department:</span>
									<span className="text-xs font-medium text-slate-700">
										{user.department}
									</span>
								</div>
							)}
						</div>
						{/* Real-time connection status */}
						<div className="pt-2 border-t border-slate-200">
							{getConnectionIndicator()}
						</div>
					</div>
				) : null}
			</div>

			<nav className="sidebar-nav">
				<ul className="flex flex-1 flex-col">
					{permissionsLoading || userLoading ? (
						<li className="text-center py-8 text-muted-foreground">
							<div className="flex flex-col items-center gap-2">
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
								<span className="text-sm">Loading navigation...</span>
							</div>
						</li>
					) : filteredNav.length === 0 ? (
						<li className="text-center py-8 text-muted-foreground">
							No navigation items available
						</li>
					) : (
						filteredNav.map((section) => {
							if (section.items.length === 0) return null;

							return (
								<div key={section.header} className="mb-4">
									<li className="sidebar-section-header mb-0 lg:mb-1 font-bold text-lg lg:text-xl">
										<span className="flex items-center gap-2">
											{section.header === "Dashboard" ? (
												<span className="text-[#03AFBF]">
													<svg
														width="24"
														height="24"
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
											) : (
												<span className="text-[#03AFBF]">
													<Image
														src={
															section.items[0]?.icon ||
															"/assets/icons/dashboard.svg"
														}
														alt={section.header.toLowerCase()}
														width={24}
														height={24}
														className="max-w-none shrink-0"
														style={{ width: "auto", height: "24px" }}
														priority={
															section.header === "Dashboard" ||
															section.header === "System Overview"
														}
													/>
												</span>
											)}
											<span className="font-bold text-base sidebar-gradient-text relative z-10">
												{section.header}
											</span>
										</span>
									</li>
									<div className="relative ml-3">
										<ul className="flex flex-col gap-1 relative z-10">
											{section.items.map((item, index) => {
												const isActive =
													pathname === item.url ||
													(pathname?.startsWith(`${item.url}/`) &&
														item.url !== "/dashboard/it");

												return (
													<li
														key={`${section.header}-${item.name}-${index}`}
														className="relative flex items-center"
													>
														{index < section.items.length + 1 && (
															<span
																className="absolute left-0 top-0 h-[24px] w-4 border-l border-[#BFBFBF]"
																style={{ zIndex: 0 }}
															/>
														)}
														<span className="absolute left-0 top-0 h-4 w-4 border-l border-b border-[#BFBFBF] rounded-bl-xl" />
														<Link
															href={item.url}
															className="ml-4 w-full flex items-start"
														>
															<span className="gap-1">
																<Image
																	src={item.icon}
																	alt={item.name.toLowerCase()}
																	width={20}
																	height={20}
																	className="max-w-none shrink-0"
																	style={{ width: "auto", height: "20px" }}
																	priority={index < 3}
																/>
															</span>
															<p
																className={cn(
																	"text-sm text-slate-900 px-2 tabs-underline font-medium flex items-center gap-2",
																	isActive && "text-[#0f5384] font-semibold",
																)}
																data-state={isActive ? "active" : undefined}
															>
																<span>{item.name}</span>
															</p>
														</Link>
													</li>
												);
											})}
										</ul>
									</div>
								</div>
							);
						})
					)}
				</ul>
			</nav>
		</aside>
	);
};

export default ITSidebar;
