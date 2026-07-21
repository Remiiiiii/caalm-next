"use client";

import type { Models } from "appwrite";
import type React from "react";
import DashboardHeader from "@/components/DashboardHeader";
import InactivityDialog from "@/components/InactivityDialog";
import MobileNavigation from "@/components/MobileNavigation";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { normalizeUserRole, type UserRole } from "@/constants/rbac";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { avatarPlaceholderUrl } from "../../constants";

type ExtendedUser = Models.User<Models.Preferences> & {
	name?: string;
	role?: UserRole;
	accountId?: string;
	fullName?: string;
	division?: string;
	prefs?: {
		avatar?: string;
	};
};

interface AuthenticatedLayoutProps {
	user: Models.User<Models.Preferences>;
	children: React.ReactNode;
}

const AuthenticatedLayout = ({
	user: serverUser,
	children,
}: AuthenticatedLayoutProps) => {
	// For now, just use the server user to avoid hydration issues
	const currentUser = serverUser;
	const user = currentUser as ExtendedUser;
	const normalizedRole = normalizeUserRole(user.role || "");

	// Initialize inactivity timer
	const { showDialog, handleContinue, handleLogout, handleClose } =
		useInactivityTimer();

	return (
		<OrganizationProvider>
			<SidebarProvider>
				<main className="flex h-screen">
					<Sidebar
						name={user.name || "Unknown User"}
						avatar={user.prefs?.avatar || avatarPlaceholderUrl}
						email={currentUser.email}
						role={normalizedRole}
						division={user.division}
					/>
					<section className="flex h-full w-full flex-1 flex-col pt-4 sm:pt-5 md:pt-6 lg:pt-7">
						<MobileNavigation
							$id={currentUser.$id}
							accountId={user.accountId || currentUser.$id}
							fullName={user.fullName || user.name || "Unknown User"}
							avatar={user.prefs?.avatar || avatarPlaceholderUrl}
							email={currentUser.email}
							role={normalizedRole}
						/>
						<div className="px-3 sm:px-4 lg:pr-7 pb-2 sm:pb-3 min-w-0 shrink-0">
							<DashboardHeader user={currentUser} />
						</div>
						<div className="main-content">{children}</div>
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
