"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect } from "react";
import { ITDashboardErrorBoundary } from "@/components/errors/ITDashboardErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ITProvider } from "@/contexts/ITContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

const ITLayoutContent = ({ children }: { children: React.ReactNode }) => {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.push("/sign-in");
		}
	}, [user, loading, router]);

	return (
		<ITProvider>
			<ITDashboardErrorBoundary>
				{loading ? (
					<div className="flex h-full min-h-[200px] items-center justify-center">
						<LoadingSpinner size="lg" label="Loading IT dashboard..." />
					</div>
				) : (
					children
				)}
			</ITDashboardErrorBoundary>
		</ITProvider>
	);
};

export default function ITClientShell({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AuthProvider>
			<OrganizationProvider>
				<ITLayoutContent>{children}</ITLayoutContent>
			</OrganizationProvider>
		</AuthProvider>
	);
}
