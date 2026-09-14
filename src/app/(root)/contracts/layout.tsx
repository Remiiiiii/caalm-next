export const dynamic = "force-dynamic";

import type React from "react";

/**
 * Contracts routes read the session (cookies) for RBAC page guards.
 * Force dynamic rendering so build-time static generation never runs them.
 */
export default function ContractsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
