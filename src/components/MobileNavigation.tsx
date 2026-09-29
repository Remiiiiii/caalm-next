"use client";

import { Cloud, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ITNavMobileSheet } from "@/components/sidebar/ITNavMobileSheet";
import { SidebarNavSections } from "@/components/sidebar/SidebarNavSections";
import SidebarUserCard from "@/components/sidebar/SidebarUserCard";
import StorageUsageBar from "@/components/StorageUsageBar";
import { Separator } from "@/components/ui/separator";
import { isITSidebarPath } from "@/constants/it-navigation";
import { ROLE_LABELS, type UserRole } from "@/constants/rbac";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalyticsPrefetch } from "@/hooks/useAnalyticsPrefetch";
import { useGroupedNavigation } from "@/hooks/useGroupedNavigation";
import { Button } from "./ui/button";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "./ui/sheet";

interface Props {
	$id: string;
	accountId: string;
	fullName: string;
	avatar: string;
	email: string;
	role: UserRole;
}

const MobileNavigation = ({ fullName, avatar, email, role }: Props) => {
	const { logout } = useAuth();
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	const { prefetchDepartmentAnalytics } = useAnalyticsPrefetch();
	const {
		groupedNav,
		permissions,
		permissionsLoading,
		rolesLoading,
		primaryRole,
		isViewer,
		isITUser,
		canUseITPortal,
		shouldShowLock,
	} = useGroupedNavigation();

	const showITSidebar =
		canUseITPortal && (isITSidebarPath(pathname) || isITUser);

	const settingsItems =
		groupedNav.find((section) => section.header === "Settings")?.items ?? [];

	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	const closeSheet = () => setOpen(false);

	return (
		<header className="mobile-header">
			<Image
				src="/assets/images/logo.svg"
				alt="CAALM logo"
				width={50}
				height={50}
				className="mt-1 h-[50px] w-[50px] object-contain"
			/>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="h-10 w-10 shrink-0"
						aria-label="Open navigation menu"
					>
						<Menu className="h-6 w-6 text-slate-700" />
					</Button>
				</SheetTrigger>
				<SheetContent
					side="left"
					className="flex h-full max-h-[100dvh] w-[min(100vw,320px)] flex-col overflow-hidden p-0 sm:max-w-sm"
				>
					<div className="shrink-0 px-4 pt-4">
						<SheetTitle className="sr-only">Navigation menu</SheetTitle>
						<div className="header-user rounded-2xl px-3 py-2">
							{avatar ? (
								<Image
									src={avatar}
									alt=""
									width={44}
									height={44}
									className="header-user-avatar shrink-0"
								/>
							) : null}
							<div className="min-w-0 flex-1">
								<p className="subtitle-2 truncate capitalize text-slate-800">
									{fullName} | {ROLE_LABELS[role]}
								</p>
								<p className="caption truncate text-slate-600">{email}</p>
							</div>
						</div>
					</div>

					<Separator className="mx-4 my-3 bg-slate-200" />

					<nav className="mobile-nav min-h-0 flex-1 overflow-y-auto px-3 pb-4">
						{showITSidebar ? (
							<ITNavMobileSheet pathname={pathname} onNavigate={closeSheet} />
						) : (
							<SidebarNavSections
								variant="mobile"
								groupedNav={groupedNav}
								pathname={pathname}
								permissionsLoading={permissionsLoading}
								rolesLoading={rolesLoading}
								permissions={permissions}
								primaryRole={primaryRole}
								isViewer={isViewer}
								shouldShowLock={shouldShowLock}
								onNavigate={closeSheet}
								onPrefetchAnalytics={prefetchDepartmentAnalytics}
							/>
						)}
					</nav>

					<p className="shrink-0 px-4 pb-2 text-xs text-slate-500">
						Full app on laptop.{" "}
						<Link
							href="/docs/concepts/desktop-and-mobile"
							className="text-[#0f5384] underline-offset-2 hover:underline"
							onClick={closeSheet}
						>
							See device differences
						</Link>
					</p>

					<div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 py-4">
						<div className="mb-3 rounded-lg border border-slate-200 bg-white/80 p-3">
							<div className="mb-1 flex items-center gap-2">
								<Cloud className="h-3.5 w-3.5 text-slate-700" />
								<p className="caption text-slate-700">Storage</p>
							</div>
							<StorageUsageBar />
						</div>

						<SidebarUserCard name={fullName} email={email} settingsItems={settingsItems} />

						<Button
							type="button"
							className="mobile-sign-out-button mt-4"
							onClick={() => logout("manual")}
						>
							<Image
								src="/assets/icons/logout.svg"
								alt=""
								width={24}
								height={24}
							/>
							<p>Sign Out</p>
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</header>
	);
};

export default MobileNavigation;
