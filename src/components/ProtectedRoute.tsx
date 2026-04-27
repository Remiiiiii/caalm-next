// src/components/ProtectedRoute.tsx
"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading";

interface ProtectedRouteProps {
	children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.replace("/sign-in");
		}
	}, [user, loading, router]);

	// Always render the same structure, but conditionally show content
	return (
		<>
			{loading ? (
				<LoadingSpinner fullScreen label="Loading..." />
			) : !user ? null : (
				children
			)}
		</>
	);
};

export default ProtectedRoute;
