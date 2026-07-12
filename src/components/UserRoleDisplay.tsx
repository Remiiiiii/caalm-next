"use client";

import { Loader2 } from "lucide-react";
import { useRoleName } from "@/hooks/useRoleName";

interface UserRoleDisplayProps {
	userId: string;
}

/**
 * Component to display user role name dynamically
 * Fetches role name from database
 */
export function UserRoleDisplay({ userId }: UserRoleDisplayProps) {
	const { roleName, loading } = useRoleName({ userId });

	if (loading) {
		return (
			<span className="text-muted-foreground inline-flex items-center gap-1.5">
				<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
				Loading...
			</span>
		);
	}

	return <span>{roleName || "N/A"}</span>;
}
