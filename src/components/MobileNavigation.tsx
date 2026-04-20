"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { ROLE_LABELS, type UserRole } from "@/constants/rbac";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { navItems } from "../../constants";
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
	return (
		<header className="mobile-header">
			<Image
				src="/assets/images/logo.svg"
				alt="logo"
				width={50}
				height={50}
				className="mt-1 h-[50px] w-auto"
				style={{ width: "auto", height: "50px" }}
			/>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetTrigger>
					<Image
						src="/assets/icons/menu.svg"
						alt="search"
						width={30}
						height={30}
					/>
				</SheetTrigger>
				<SheetContent className="shad-sheet h-screen px-3">
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
							<div className="sm:hidden lg:block">
								<p className="subtitle-2 capitalize">
									{fullName} | {ROLE_LABELS[role]}
								</p>
								{/* <p className="subtitle-2 capitalize">{role}</p> */}
								<p className="caption">{email}</p>
							</div>
						</div>
						<Separator className="mb-4 bg-light-200/20" />
					</SheetTitle>
					<nav className="mobile-nav">
						<ul className="mobile-nav-list">
							{navItems.map(({ url, name, icon }) => {
								// Support both string and array for url
								const urls = Array.isArray(url) ? url : [url];
								const isActive = urls.some(
									(u) => pathname === u || pathname?.startsWith(`${u}/`),
								);
								return (
									<li
										key={name}
										className={cn("mobile-nav-item", isActive && "shad-active")}
									>
										<Link
											href={urls[0]}
											className="lg:w-full flex items-center gap-3"
										>
											<Image
												src={icon}
												alt={name}
												width={24}
												height={24}
												className={cn(
													"nav-icon",
													isActive && "nav-icon-active",
												)}
											/>
											<p>{name}</p>
										</Link>
									</li>
								);
							})}
						</ul>
					</nav>
					<Separator className="my-5 bg-light-200/20" />
					<div className="flex flex-col justify-between gap-5 pb-5">
						<FileUploader ownerId={ownerId} accountId={accountId} />
						<Button
							type="submit"
							className="mobile-sign-out-button"
							onClick={() => {
								logout("manual");
							}}
						>
							<Image
								src="/assets/icons/logout.svg"
								alt="logo"
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
