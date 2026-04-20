/**
 * IT Dashboard Layout
 * Provides IT-specific context (ITProvider) and error boundary for IT dashboard pages
 * Note: Sidebar, navigation, and header are rendered by the parent root layout
 */

"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect } from "react";
import { ITDashboardErrorBoundary } from "@/components/errors/ITDashboardErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ITProvider } from "@/contexts/ITContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

const ITLayoutContent = ({ children }: { children: React.ReactNode }) => {
	// Always call all hooks unconditionally at the top level
	const { user, loading } = useAuth();
	const router = useRouter();

	// Redirect to sign-in if not authenticated (role check is handled by routing)
	useEffect(() => {
		if (!loading && !user) {
			router.push("/sign-in");
		}
	}, [user, loading, router]);

	// IT layout should ONLY provide context and error boundary
	// The parent root layout already renders Sidebar, MobileNavigation, and DashboardHeader
	return (
		<ITProvider>
			<ITDashboardErrorBoundary>
				{loading ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
							<p className="text-gray-600">Loading IT dashboard...</p>
						</div>
					</div>
				) : (
					children
				)}
			</ITDashboardErrorBoundary>
		</ITProvider>
	);
};

const ITLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<AuthProvider>
			<OrganizationProvider>
				<ITLayoutContent>{children}</ITLayoutContent>
			</OrganizationProvider>
		</AuthProvider>
	);
};

export default ITLayout;
