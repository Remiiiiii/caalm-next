"use client";

import { Cloud, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileNavMenuTriggerIcon } from "@/components/mobile/MobileNavMenuTrigger";
import { ITNavMobileSheet } from "@/components/sidebar/ITNavMobileSheet";
import { SidebarNavSections } from "@/components/sidebar/SidebarNavSections";
import SidebarUserCard from "@/components/sidebar/SidebarUserCard";
import StorageUsageBar from "@/components/StorageUsageBar";
import {
	initialsFromName,
	isUsableAvatarUrl,
} from "@/lib/user/displayAvatar";
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
	// If the image URL 404s, fall back to initials instead of a broken image.
	const [avatarFailed, setAvatarFailed] = useState(false);
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

	useEffect(() => {
		setAvatarFailed(false);
	}, [avatar]);

	const closeSheet = () => setOpen(false);
	const showAvatar = isUsableAvatarUrl(avatar) && !avatarFailed;
	const initials = initialsFromName(fullName);

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
						className="group h-10 w-10 shrink-0"
						aria-label={open ? "Close navigation menu" : "Open navigation menu"}
						aria-expanded={open}
					>
						<MobileNavMenuTriggerIcon open={open} />
					</Button>
				</SheetTrigger>
				<SheetContent
					side="left"
					className="flex h-full max-h-[100dvh] w-[min(100vw,320px)] flex-col overflow-hidden p-0 sm:max-w-sm"
				>
					{/* pt-14 clears the absolute sheet close (X) so it does not cover the user card */}
					<div className="shrink-0 px-4 pt-14">
						<SheetTitle className="sr-only">Navigation menu</SheetTitle>
						<div className="header-user rounded-2xl px-3 py-2">
							{showAvatar ? (
								<Image
									src={avatar}
									alt=""
									width={44}
									height={44}
									className="header-user-avatar shrink-0"
									onError={() => setAvatarFailed(true)}
								/>
							) : (
								<span
									className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue/10 text-sm font-semibold text-[#0f5384] ring-1 ring-blue/20"
									aria-hidden
								>
									{initials}
								</span>
							)}
							<div className="min-w-0 flex-1">
								<p className="subtitle-2 truncate capitalize text-slate-800">
									{fullName}
								</p>
								<p className="caption truncate text-slate-600">
									{ROLE_LABELS[role]}
								</p>
								<p className="caption truncate text-slate-500">{email}</p>
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

					<div className="mx-4 mb-2 shrink-0 rounded-lg border border-blue/20 bg-blue/10 px-3 py-2 text-xs text-slate-700">
						<span className="font-medium text-slate-800">Companion mode.</span>{" "}
						Full CAALM runs on laptop.{" "}
						<Link
							href="/docs/concepts/desktop-and-mobile"
							className="font-medium text-[#0f5384] underline-offset-2 hover:underline"
							onClick={closeSheet}
						>
							Device differences
						</Link>
					</div>

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
							variant="outline"
							className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border-[0.25px] border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-none transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
							onClick={() => logout("manual")}
						>
							<LogOut className="h-4 w-4" />
							Sign Out
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</header>
	);
};

export default MobileNavigation;
