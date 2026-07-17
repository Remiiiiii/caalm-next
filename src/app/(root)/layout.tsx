"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { Suspense, useEffect, useMemo } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import MobileNavigation from "@/components/MobileNavigation";
import Sidebar from "@/components/Sidebar";
import { LoadingSpinner } from "@/components/ui/loading";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

const LayoutContent = ({ children }: { children: React.ReactNode }) => {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.push("/sign-in");
		}
	}, [user, loading, router]);

	// Memoize sidebar props - always return an object to ensure consistent rendering
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

	// Always render the same structure, but conditionally show content
	return (
		<>
			{loading ? (
				<LoadingSpinner fullScreen label="Loading..." />
			) : !user ? (
				<div className="flex h-screen items-center justify-center">
					<div className="text-center">
						<p className="text-gray-600">Redirecting to sign in...</p>
					</div>
				</div>
			) : (
				<main className="flex h-screen overflow-hidden">
					<Sidebar {...sidebarProps} />
					<section className="flex h-full flex-1 flex-col min-w-0 pt-4 sm:pt-5 md:pt-6 lg:pt-7">
						<MobileNavigation {...navigationProps} />
						<div className="px-3 sm:px-4 lg:pr-7 pb-2 sm:pb-3 min-w-0 shrink-0">
							<DashboardHeader user={user} />
						</div>
						<div className="main-content">
							<Suspense
								fallback={
									<div className="flex min-h-[200px] items-center justify-center">
										<LoadingSpinner size="md" />
									</div>
								}
							>
								{children}
							</Suspense>
						</div>
					</section>
					<Toaster />
				</main>
			)}
		</>
	);
};

const Layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<AuthProvider>
			<OrganizationProvider>
				<LayoutContent>{children}</LayoutContent>
			</OrganizationProvider>
		</AuthProvider>
	);
};

export default Layout;
