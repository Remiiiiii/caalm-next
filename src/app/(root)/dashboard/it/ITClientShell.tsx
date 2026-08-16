"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect } from "react";
import { ITDashboardErrorBoundary } from "@/components/errors/ITDashboardErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { ITProvider } from "@/contexts/ITContext";

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
	// Auth and org already wrap the app in (root)/layout. A second pair here
	// remounts those providers on every IT page and can trip the "more hooks
	// than during the previous render" error during client navigations.
	return (
		<ITLayoutContent>
			{children}
		</ITLayoutContent>
	);
}
