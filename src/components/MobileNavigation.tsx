"use client";

import { Lock, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { ROLE_LABELS, type UserRole } from "@/constants/rbac";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupedNavigation } from "@/hooks/useGroupedNavigation";
import { cn } from "@/lib/utils";
import FileUploader from "./FileUploader";
import { Button } from "./ui/button";

interface Props {
	$id: string;
	accountId: string;
	fullName: string;
	avatar: string;
	email: string;
	role: UserRole;
}

const MobileNavigation = ({
	$id: ownerId,
	accountId,
	fullName,
	avatar,
	email,
	role,
}: Props) => {
	const { logout } = useAuth();
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	const {
		groupedNav,
		permissionsLoading,
		rolesLoading,
		isViewer,
		shouldShowLock,
	} = useGroupedNavigation();

	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	const isActive = (url: string) =>
		pathname === url ||
		(pathname?.startsWith(`${url}/`) && url !== "/analytics");

	return (
		<header className="mobile-header">
			<Image
				src="/assets/images/logo.svg"
				alt="CAALM logo"
				width={50}
				height={50}
				className="mt-1 h-[50px] w-auto"
				style={{ width: "auto", height: "50px" }}
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
				<SheetContent className="shad-sheet flex h-screen flex-col overflow-y-auto px-3">
					<SheetTitle>
						<div className="header-user">
							{avatar && (
								<Image
									src={avatar}
									alt="avatar"
									width={44}
									height={44}
									className="header-user-avatar"
								/>
							)}
							<div>
								<p className="subtitle-2 capitalize">
									{fullName} | {ROLE_LABELS[role]}
								</p>
								<p className="caption">{email}</p>
							</div>
						</div>
						<Separator className="mb-4 bg-light-200/20" />
					</SheetTitle>
					<nav className="mobile-nav flex-1 overflow-y-auto">
						{groupedNav.length === 0 && permissionsLoading && rolesLoading ? (
							<div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
								<span className="text-sm">Loading navigation...</span>
							</div>
						) : groupedNav.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No navigation items available
							</p>
						) : (
							<ul className="mobile-nav-list">
								{groupedNav.map((section) => (
									<li key={section.header}>
										{section.header === "Settings" && (
											<div
												aria-hidden
												className="mx-4 mb-3 border-t border-slate-200/80"
												role="separator"
											/>
										)}
										<p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
											{section.header}
										</p>
										<ul className="mb-4 flex flex-col gap-1">
											{section.items.map((item) => {
												const active = item.url ? isActive(item.url) : false;
												return (
													<li
														key={`${section.header}-${item.name}`}
														className={cn(
															"mobile-nav-item",
															active && "shad-active",
														)}
													>
														<Link
															href={item.url}
															className="flex w-full items-center gap-3"
															onClick={() => setOpen(false)}
														>
															<Image
																src={item.icon}
																alt=""
																width={24}
																height={24}
																className={cn(
																	"nav-icon shrink-0",
																	active && "nav-icon-active",
																)}
															/>
															<span className="flex min-w-0 flex-1 items-center gap-2">
																<span className="truncate">{item.name}</span>
																{shouldShowLock(item) && (
																	<Lock
																		className="h-3 w-3 shrink-0 text-gray-500"
																		aria-hidden
																	/>
																)}
																{isViewer && item.viewerReadOnly && (
																	<span className="shrink-0 text-xs text-gray-500">
																		(read-only)
																	</span>
																)}
															</span>
														</Link>
													</li>
												);
											})}
										</ul>
									</li>
								))}
							</ul>
						)}
					</nav>
					<Separator className="my-5 bg-light-200/20" />
					<div className="flex flex-col justify-between gap-5 pb-5">
						<FileUploader ownerId={ownerId} accountId={accountId} />
						<Button
							type="button"
							className="mobile-sign-out-button"
							onClick={() => {
								logout("manual");
							}}
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
