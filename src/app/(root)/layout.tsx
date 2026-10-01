"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { Suspense, useEffect, useMemo } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { DesktopFirstGate } from "@/components/DesktopFirstGate";
import DemoTourLayer from "@/components/demo/tour/DemoTourLayer";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";
import WaveLoopBackground from "@/components/landing/WaveLoopBackground";
import MobileNavigation from "@/components/MobileNavigation";
import NotificationSoundListener from "@/components/NotificationSoundListener";
import Sidebar from "@/components/Sidebar";
import ReportIssueFab from "@/components/tickets/ReportIssueFab";
import { LoadingSpinner } from "@/components/ui/loading";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { StepUpProvider } from "@/contexts/StepUpContext";
import { resolveAvatarDisplayUrl } from "@/lib/utils";

/** Prefer prefs.profileImage (built URL), then file id → storage URL. Empty = initials. */
function resolveNavAvatar(user: {
	avatar?: string | null;
	profileImageId?: string | null;
	prefs?: {
		avatar?: string | null;
		profileImage?: string | null;
		profileImageId?: string | null;
	};
}): string {
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

const LayoutContent = ({ children }: { children: React.ReactNode }) => {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.push("/sign-in");
		}
	}, [user, loading, router]);

	const sidebarProps = useMemo(() => {
		if (!user) {
			return {
				name: "Loading...",
				avatar: "",
				email: "",
				role: "",
				division: "",
			};
		}
		const u = user as {
			name?: string;
			avatar?: string | null;
			profileImageId?: string | null;
			role?: string;
			division?: string;
			prefs?: {
				avatar?: string | null;
				profileImage?: string | null;
				profileImageId?: string | null;
			};
		};
		return {
			name: u.name || "Unknown User",
			avatar: resolveNavAvatar(u),
			email: user.email,
			role: u.role || "",
			division: u.division || "",
		};
	}, [
		user?.$id,
		user?.email,
		(user as { name?: string })?.name,
		(user as { avatar?: string })?.avatar,
		(user as { profileImageId?: string })?.profileImageId,
		(user as { prefs?: { profileImage?: string; profileImageId?: string; avatar?: string } })
			?.prefs?.profileImage,
		(user as { prefs?: { profileImageId?: string } })?.prefs?.profileImageId,
		(user as { prefs?: { avatar?: string } })?.prefs?.avatar,
		(user as { role?: string })?.role,
		(user as { division?: string })?.division,
		user,
	]);

	const navigationProps = useMemo(() => {
		if (!user) {
			return {
				$id: "",
				accountId: "",
				fullName: "Loading...",
				avatar: "",
				email: "",
				role: "",
			};
		}
		const u = user as {
			accountId?: string;
			fullName?: string;
			name?: string;
			avatar?: string | null;
			profileImageId?: string | null;
			role?: string;
			prefs?: {
				avatar?: string | null;
				profileImage?: string | null;
				profileImageId?: string | null;
			};
		};
		return {
			$id: user.$id,
			accountId: u.accountId || user.$id,
			fullName: u.fullName || u.name || "Unknown User",
			avatar: resolveNavAvatar(u),
			email: user.email,
			role: u.role || "",
		};
	}, [
		user?.$id,
		user?.email,
		(user as { accountId?: string })?.accountId,
		(user as { fullName?: string })?.fullName,
		(user as { name?: string })?.name,
		(user as { avatar?: string })?.avatar,
		(user as { profileImageId?: string })?.profileImageId,
		(user as { prefs?: { profileImage?: string } })?.prefs?.profileImage,
		(user as { prefs?: { profileImageId?: string } })?.prefs?.profileImageId,
		(user as { prefs?: { avatar?: string } })?.prefs?.avatar,
		(user as { role?: string })?.role,
		user,
	]);

	const pageSlot = (
		<Suspense
			fallback={
				<div className="flex min-h-[200px] items-center justify-center">
					<LoadingSpinner size="md" />
				</div>
			}
		>
			{children}
		</Suspense>
	);

	// App Router layouts must always render `children`. If the page slot is
	// omitted during SSR (auth still loading), Next 16 serves a 404 even when
	// the route file exists.
	if (!user) {
		return (
			<>
				{loading ? (
					<LoadingSpinner fullScreen label="Loading..." />
				) : (
					<div className="flex h-screen items-center justify-center">
						<div className="text-center">
							<p className="text-gray-600">Redirecting to sign in...</p>
						</div>
					</div>
				)}
				<div hidden>{pageSlot}</div>
			</>
		);
	}

	return (
		<SidebarProvider>
			<NotificationSoundListener />
			<main className="relative flex h-screen flex-col overflow-hidden">
				<WaveLoopBackground className="fixed inset-0 -z-10 h-full w-full object-cover" />
				<ImpersonationBanner />
				<div className="relative z-0 flex min-h-0 flex-1 overflow-hidden">
					<Sidebar {...sidebarProps} />
					<section className="flex h-full min-w-0 flex-1 flex-col pt-4 sm:pt-5 md:pt-6 lg:pt-7">
						<MobileNavigation {...navigationProps} />
						<div className="min-w-0 shrink-0 px-3 pb-2 sm:px-4 sm:pb-3 lg:pr-7">
							<DashboardHeader user={user} />
						</div>
						<div className="main-content">
							<DesktopFirstGate>{pageSlot}</DesktopFirstGate>
						</div>
					</section>
					<Toaster />
					<DemoTourLayer />
					<ReportIssueFab />
				</div>
			</main>
		</SidebarProvider>
	);
};

const Layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<AuthProvider>
			<OrganizationProvider>
				<StepUpProvider>
					<ImpersonationProvider>
						<LayoutContent>{children}</LayoutContent>
					</ImpersonationProvider>
				</StepUpProvider>
			</OrganizationProvider>
		</AuthProvider>
	);
};

export default Layout;
