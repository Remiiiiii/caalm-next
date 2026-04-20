/**
 * IT Dashboard Main Page
 * Overview dashboard with system health, alerts, and quick stats
 */

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ITDashboard from "@/components/ITDashboard";
import { useAuth } from "@/contexts/AuthContext";

export default function ITDashboardPage() {
	// Always call all hooks unconditionally at the top level
	const { user, loading } = useAuth();
	const router = useRouter();

	// Redirect if not authenticated
	useEffect(() => {
		if (!loading && !user) {
			router.push("/sign-in");
		}
	}, [user, loading, router]);

	// Always render ITDashboard - it handles its own loading state internally
	// This ensures consistent hook calls across renders
	return <ITDashboard />;
}
