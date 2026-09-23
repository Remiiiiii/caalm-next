"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { Suspense, useEffect, useMemo } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { DesktopFirstGate } from "@/components/DesktopFirstGate";
import DemoTourLayer from "@/components/demo/tour/DemoTourLayer";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";
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

const LayoutContent = ({ children }: { children: React.ReactNode }) => {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.push("/sign-in");
		}
	}, [user, loading, router]);

	// Memoize sidebar props - always return an object to ensure consistent rendering - always return an object to ensure consistent rendering
	const sidebarProps = useMemo(() => {
		if (!user) {
			return {
				name: "Loading...",
				avatar: "/assets/images/avatar-placeholder.png",
				email: "",
				role: "",
				division: "",
			};
		}
		return {
			name: user.name || "Unknown User",
			avatar:
				(user as any).prefs?.avatar || "/assets/images/avatar-placeholder.png",
			email: user.email,
			role: (user as any).role || "",
			division: (user as any).division || "",
		};
	}, [
		user?.$id,
		user?.email,
		(user as any)?.name,
		(user as any)?.prefs?.avatar,
		(user as any)?.role,
		(user as any)?.division,
		user,
	]);

	// Memoize navigation props - always return an object to ensure consistent rendering
	const navigationProps = useMemo(() => {
		if (!user) {
			return {
				$id: "",
				accountId: "",
				fullName: "Loading...",
				avatar: "/assets/images/avatar-placeholder.png",
				email: "",
				role: "",
			};
		}
		return {
			$id: user.$id,
			accountId: (user as any).accountId || user.$id,
			fullName: (user as any).fullName || (user as any).name || "Unknown User",
			avatar:
				(user as any).prefs?.avatar || "/assets/images/avatar-placeholder.png",
			email: user.email,
			role: (user as any).role || "",
		};
	}, [
		user?.$id,
		user?.email,
		(user as any)?.accountId,
		(user as any)?.fullName,
		(user as any)?.name,
		(user as any)?.prefs?.avatar,
		(user as any)?.role,
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
			<main className="flex h-screen flex-col overflow-hidden">
				<ImpersonationBanner />
				<div className="flex min-h-0 flex-1 overflow-hidden">
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
