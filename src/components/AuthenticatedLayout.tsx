"use client";

import type { Models } from "appwrite";
import type React from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { DesktopFirstGate } from "@/components/DesktopFirstGate";
import { DesktopNotificationNavListener } from "@/components/DesktopNotificationNavListener";
import InactivityDialog from "@/components/InactivityDialog";
import WaveLoopBackground from "@/components/landing/WaveLoopBackground";
import MobileNavigation from "@/components/MobileNavigation";
import NotificationSoundListener from "@/components/NotificationSoundListener";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { normalizeUserRole, type UserRole } from "@/constants/rbac";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { resolveAvatarDisplayUrl } from "@/lib/utils";

type ExtendedUser = Models.User<Models.Preferences> & {
	name?: string;
	role?: UserRole;
	accountId?: string;
	fullName?: string;
	division?: string;
	avatar?: string | null;
	profileImageId?: string | null;
	prefs?: {
		avatar?: string;
		profileImage?: string | null;
		profileImageId?: string | null;
	};
};

interface AuthenticatedLayoutProps {
	user: Models.User<Models.Preferences>;
	children: React.ReactNode;
}

function resolveNavAvatar(user: ExtendedUser): string {
	const prefUrl = user.prefs?.profileImage?.trim();
	if (
		prefUrl &&
		!prefUrl.includes("avatar-placeholder") &&
		!prefUrl.includes("3d-illustration-person-with-sunglasses")
	) {
		return prefUrl;
	}
	return (
		resolveAvatarDisplayUrl({
			avatar: user.avatar || user.prefs?.avatar,
			profileImageId:
				user.profileImageId?.trim() ||
				user.prefs?.profileImageId?.trim() ||
				null,
		}) || ""
	);
}

const AuthenticatedLayout = ({
	user: serverUser,
	children,
}: AuthenticatedLayoutProps) => {
	// For now, just use the server user to avoid hydration issues
	const currentUser = serverUser;
	const user = currentUser as ExtendedUser;
	const normalizedRole = normalizeUserRole(user.role || "");
	const avatarUrl = resolveNavAvatar(user);

	// Initialize inactivity timer
	const { showDialog, handleContinue, handleLogout, handleClose } =
		useInactivityTimer();

	return (
		<OrganizationProvider>
			<SidebarProvider>
				<NotificationSoundListener />
				<DesktopNotificationNavListener />
				<main className="relative flex h-screen">
					<WaveLoopBackground className="fixed inset-0 -z-10 h-full w-full object-cover" />
					<Sidebar
						name={user.name || "Unknown User"}
						avatar={avatarUrl}
						email={currentUser.email}
						role={normalizedRole}
						division={user.division}
					/>
					<section className="relative z-0 flex h-full w-full flex-1 flex-col pt-4 sm:pt-5 md:pt-6 lg:pt-7">
						<MobileNavigation
							$id={currentUser.$id}
							accountId={user.accountId || currentUser.$id}
							fullName={user.fullName || user.name || "Unknown User"}
							avatar={avatarUrl}
							email={currentUser.email}
							role={normalizedRole}
						/>
						<div className="px-3 sm:px-4 lg:pr-7 pb-2 sm:pb-3 min-w-0 shrink-0">
							<DashboardHeader user={currentUser} />
						</div>
						<div className="main-content">
							<DesktopFirstGate>{children}</DesktopFirstGate>
						</div>
					</section>
					<Toaster />

					{/* Inactivity Dialog */}
					<InactivityDialog
						isOpen={showDialog}
						onClose={handleClose}
						onContinue={handleContinue}
						onLogout={handleLogout}
					/>
				</main>
			</SidebarProvider>
		</OrganizationProvider>
	);
};

export default AuthenticatedLayout;
