/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 */

"use client";

import { type ReactNode, useEffect, useState } from "react";
import type { PermissionKey } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
	permission?: PermissionKey | PermissionKey[];
	requireAll?: boolean; // If multiple permissions, require all (default: any)
	fallback?: ReactNode;
	children: ReactNode;
	showOnLoading?: boolean; // Show children while loading (default: false)
}

export function PermissionGate({
	permission,
	requireAll = false,
	fallback = null,
	children,
	showOnLoading = false,
}: PermissionGateProps) {
	const { hasPermission, hasAnyPermission, hasAllPermissions, loading } =
		usePermissions();
	const [hasAccess, setHasAccess] = useState(false);

	useEffect(() => {
		if (!permission) {
			setHasAccess(true);
			return;
		}

		if (loading) {
			setHasAccess(showOnLoading);
			return;
		}

		const checkAccess = async () => {
			if (Array.isArray(permission)) {
				const result = requireAll
					? await hasAllPermissions(permission)
					: await hasAnyPermission(permission);
				setHasAccess(result);
			} else {
				const result = await hasPermission(permission);
				setHasAccess(result);
			}
		};

		checkAccess();
	}, [
		permission,
		requireAll,
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,
		loading,
		showOnLoading,
	]);

	if (loading && !showOnLoading) {
		return <>{fallback}</>;
	}

	return <>{hasAccess ? children : fallback}</>;
}

export default PermissionGate;
