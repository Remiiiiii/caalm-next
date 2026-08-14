"use client";

import {
	Check,
	Lock,
	Shield,
	Users,
	Building2,
	ChevronRight,
	CheckCircle2,
	XCircle,
	Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

	const filteredGrouped = useMemo(() => {
		let filtered = grouped;

		if (selectedCategory) {
			filtered = filtered.filter(([category]) => category === selectedCategory);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered
				.map(([category, items]) => {
					const matchedItems = items.filter(
						(item) =>
							item.name.toLowerCase().includes(query) ||
							item.description?.toLowerCase().includes(query) ||
							item.key.toLowerCase().includes(query),
					);
					return [category, matchedItems] as [string, typeof items];
				})
				.filter(([, items]) => items.length > 0);
		}

		return filtered;
	}, [grouped, searchQuery, selectedCategory]);

	const totalGranted = useMemo(
		() =>
			grouped.reduce(
				(sum, [, items]) => sum + items.filter((i) => i.granted).length,
				0,
			),
		[grouped],
	);

	const totalPermissions = useMemo(
		() => grouped.reduce((sum, [, items]) => sum + items.length, 0),
		[grouped],
	);

	if (permissionsLoading || rolesLoading) {
		return (
			<div className="py-12 flex justify-center">
				<LoadingSpinner size="sm" label="Loading your access…" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Summary Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Roles Card */}
				<GlassCard className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium sidebar-gradient-text">
									Active Roles
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
									<span>{roles.length}</span>
									<span className="inline-block ml-2 pb-1">
										<Users className="h-8 w-8 text-slate-600" />
									</span>
								</div>
								<p className="text-xs text-slate-600 mt-1">
									{roles.length === 1 ? "Role" : "Roles"} assigned
								</p>
							</div>
						</div>
					</CardContent>
				</GlassCard>

				{/* Permissions Card */}
				<GlassCard className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium sidebar-gradient-text">
									Permissions
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
									<span>{totalGranted}</span>
									<span className="text-slate-500 text-lg mx-1">/</span>
									<span className="text-slate-500 text-lg">{totalPermissions}</span>
									<span className="inline-block ml-2 pb-1">
										<CheckCircle2 className="h-8 w-8 text-slate-600" />
									</span>
								</div>
								<p className="text-xs text-slate-600 mt-1">
									Granted permissions
								</p>
							</div>
						</div>
					</CardContent>
				</GlassCard>

				{/* Organization Card */}
				<GlassCard className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div className="w-full">
								<p className="text-sm font-medium sidebar-gradient-text">
									Organization
								</p>
								<div className="flex items-center pt-2">
									<Building2 className="h-5 w-5 text-[#0f5384] mr-2" />
									<p className="text-base font-semibold text-slate-700 truncate">
										{formatOrganizationLabel(orgId)}
									</p>
								</div>
								<p className="text-xs text-slate-600 mt-1">Current scope</p>
							</div>
						</div>
					</CardContent>
				</GlassCard>
			</div>

			{/* Roles Overview */}
			<GlassCard className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<Shield className="h-5 w-5 text-[#0f5384]" />
							<h2 className="text-lg font-semibold sidebar-gradient-text">
								Your Roles
							</h2>
						</div>
						{canManageRoles && (
							<Button
								asChild
								variant="outline"
								className="primary-btn px-3 sm:px-4 cursor-pointer"
							>
								<Link href="/dashboard/admin/roles">
									Manage roles
									<ChevronRight className="h-4 w-4 ml-1" />
								</Link>
							</Button>
						)}
					</div>
					<div className="flex flex-wrap gap-3">
						{roles.length === 0 ? (
							<div className="w-full text-center py-8">
								<XCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
								<p className="text-sm text-slate-500">No roles assigned</p>
							</div>
						) : (
							roles.map((r) => (
								<div
									key={r.roleId}
									className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
								>
									<div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center flex-shrink-0">
										<Shield className="h-4 w-4 text-[#0f5384]" />
									</div>
									<span className="text-sm font-semibold text-slate-700">
										{r.roleName || "Role"}
									</span>
								</div>
							))
						)}
					</div>
				</CardContent>
			</GlassCard>

			{/* Search and Filter */}
			<GlassCard className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex flex-col sm:flex-row gap-4">
						{/* Search */}
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
							<Input
								type="text"
								placeholder="Search permissions..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 shad-input border border-slate-200 bg-white"
							/>
						</div>
						{/* Category Filter */}
						<div className="flex gap-2 flex-wrap">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setSelectedCategory(null)}
								className={`${
									selectedCategory === null
										? "bg-blue/10 border-blue/20 text-[#0f5384]"
										: "bg-white"
								} cursor-pointer transition-all duration-200`}
							>
								All Categories
							</Button>
							{grouped.map(([category]) => (
								<Button
									key={category}
									variant="outline"
									size="sm"
									onClick={() =>
										setSelectedCategory(
											selectedCategory === category ? null : category,
										)
									}
									className={`${
										selectedCategory === category
											? "bg-blue/10 border-blue/20 text-[#0f5384]"
											: "bg-white"
									} cursor-pointer transition-all duration-200`}
								>
									{formatCategoryLabel(category)}
								</Button>
							))}
						</div>
					</div>
				</CardContent>
			</GlassCard>

			{/* Permissions by Category */}
			{filteredGrouped.length === 0 ? (
				<GlassCard className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-12 text-center">
						<Search className="h-16 w-16 text-slate-300 mx-auto mb-4" />
						<p className="text-slate-500 font-medium">No permissions found</p>
						<p className="text-sm text-slate-400 mt-2">
							Try adjusting your search or filter
						</p>
					</CardContent>
				</GlassCard>
			) : (
				filteredGrouped.map(([category, items]) => {
					const grantedCount = items.filter((i) => i.granted).length;
					const percentage = Math.round((grantedCount / items.length) * 100);

					return (
						<GlassCard key={category} className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-lg font-semibold sidebar-gradient-text">
										{formatCategoryLabel(category)}
									</h2>
									<div className="flex items-center gap-3">
										<span className="text-xs text-slate-500">
											{grantedCount} of {items.length}
										</span>
										<div className="px-2 py-1 rounded-md bg-blue/10 border border-blue/20">
											<span className="text-xs font-semibold text-[#0f5384]">
												{percentage}%
											</span>
										</div>
									</div>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{items.map((item) => (
										<div
											key={item.key}
											className={`flex items-start gap-3 rounded-lg border-2 px-4 py-3 transition-all duration-200 ${
												item.granted
													? "border-green/20 bg-green/5 hover:border-green/30 hover:bg-green/10"
													: "border-slate-200 bg-white hover:border-slate-300"
											} shadow-sm hover:shadow-md cursor-pointer`}
										>
											<div
												className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
													item.granted
														? "bg-green/20"
														: "bg-slate-100"
												}`}
											>
												{item.granted ? (
													<CheckCircle2 className="h-4 w-4 text-green" />
												) : (
													<Lock className="h-4 w-4 text-slate-400" />
												)}
											</div>
											<div className="min-w-0 flex-1">
												<p
													className={`text-sm font-semibold ${
														item.granted ? "text-slate-700" : "text-slate-500"
													}`}
												>
													{item.name}
												</p>
												{item.description ? (
													<p className="text-xs text-slate-500 mt-1 leading-relaxed">
														{item.description}
													</p>
												) : (
													<p className="text-xs text-slate-400 mt-1 font-mono">
														{item.key}
													</p>
												)}
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</GlassCard>
					);
				})
			)}
		</div>
	);
}
