export const dynamic = "force-dynamic";

import type React from "react";
import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import ITClientShell from "./ITClientShell";

export default async function ITLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await requireDashboardPathAccess("/dashboard/it");
	return <ITClientShell>{children}</ITClientShell>;
}
