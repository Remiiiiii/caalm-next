"use client";

import { Check, Lock, Shield } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { PERMISSION_DEFINITIONS, PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRoles } from "@/hooks/useUserRoles";

function formatCategoryLabel(category: string): string {
	return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatOrganizationLabel(orgId: string | null): string {
	if (!orgId) return "—";
	return orgId
		.replace(/[_-]+/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.trim();
}

export default function MyAccessPanel() {
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { roles, loading: rolesLoading } = useUserRoles();
	const { orgId } = useOrganization();

	const canManageRoles = permissions.includes(PERMISSIONS.USERS.ASSIGN_ROLES);

	const grouped = useMemo(() => {
		const permissionSet = new Set(permissions);
		const byCategory: Record<
			string,
			Array<{
				key: string;
				name: string;
				granted: boolean;
				description?: string;
			}>
		> = {};

		for (const def of PERMISSION_DEFINITIONS) {
			const category = def.category || "other";
			if (!byCategory[category]) byCategory[category] = [];
			byCategory[category].push({
				key: def.key,
				name: def.name,
				description: def.description,
				granted: permissionSet.has(def.key as (typeof permissions)[number]),
			});
		}

		return Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b));
	}, [permissions]);

	if (permissionsLoading || rolesLoading) {
		return (
			<div className="py-12 flex justify-center">
				<LoadingSpinner size="sm" label="Loading your access…" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<GlassCard className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex items-start justify-between gap-4 flex-wrap">
						<div>
							<p className="text-sm font-medium sidebar-gradient-text mb-1">
								Your roles
							</p>
							<div className="flex flex-wrap gap-2 mt-2">
								{roles.length === 0 ? (
									<span className="text-sm text-slate-600">
										No roles assigned
									</span>
								) : (
									roles.map((r) => (
										<Badge
											key={r.roleId}
											variant="outline"
											className="border-blue/20 bg-blue/10 text-slate-900"
										>
											<Shield className="h-3 w-3 mr-1 text-[#0f5384]" />
											{r.roleName || "Role"}
										</Badge>
									))
								)}
							</div>
						</div>
						<div className="text-sm text-slate-600">
							<p>
								Organization:{" "}
								<span className="font-medium text-slate-900">
									{formatOrganizationLabel(orgId)}
								</span>
							</p>
							<p className="mt-1">
								{permissions.length} permission
								{permissions.length === 1 ? "" : "s"} granted
							</p>
						</div>
					</div>
					{canManageRoles ? (
						<div className="mt-4">
							<Button
								asChild
								variant="outline"
								className="primary-btn px-3 sm:px-4 cursor-pointer"
							>
								<Link href="/dashboard/admin/roles">Manage roles</Link>
							</Button>
						</div>
					) : null}
				</CardContent>
			</GlassCard>

			{grouped.map(([category, items]) => {
				const grantedCount = items.filter((i) => i.granted).length;
				return (
					<GlassCard key={category} className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-sm font-medium sidebar-gradient-text">
									{formatCategoryLabel(category)}
								</h2>
								<span className="text-xs text-slate-500">
									{grantedCount} of {items.length}
								</span>
							</div>
							<ul className="space-y-2">
								{items.map((item) => (
									<li
										key={item.key}
										className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
									>
										{item.granted ? (
											<Check className="h-4 w-4 text-green mt-0.5 shrink-0" />
										) : (
											<Lock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
										)}
										<div className="min-w-0">
											<p
												className={`text-sm font-medium ${
													item.granted ? "text-slate-900" : "text-slate-500"
												}`}
											>
												{item.name}
											</p>
											{item.description ? (
												<p className="text-xs text-slate-500 mt-0.5">
													{item.description}
												</p>
											) : (
												<p className="text-xs text-slate-400 mt-0.5 font-mono">
													{item.key}
												</p>
											)}
										</div>
									</li>
								))}
							</ul>
						</CardContent>
					</GlassCard>
				);
			})}
		</div>
	);
}
