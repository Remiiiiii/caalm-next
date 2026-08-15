"use client";

import {
	Building2,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Lock,
	Search,
	Shield,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	const [collapsedCategories, setCollapsedCategories] = useState<
		Record<string, boolean>
	>({});

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

	const filteredRoles = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return roles;
		return roles.filter((role) =>
			(role.roleName || "role").toLowerCase().includes(query),
		);
	}, [roles, searchQuery]);

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
									<span className="text-slate-500 text-lg">
										{totalPermissions}
									</span>
									<span className="inline-block ml-2 pb-1">
										<CheckCircle2 className="h-8 w-8 text-green" />
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
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
						<div className="flex items-center gap-3 shrink-0">
							<Shield className="h-5 w-5 text-[#0f5384]" />
							<div>
								<h2 className="text-lg font-semibold sidebar-gradient-text">
									Your Roles
								</h2>
								<p className="text-sm text-slate-600">
									{roles.length}{" "}
									{roles.length === 1 ? "active role" : "active roles"}
								</p>
							</div>
						</div>
						<div
							className="hidden h-10 w-px shrink-0 bg-slate-300 lg:block"
							aria-hidden
						/>
						<div className="relative min-w-0 flex-1">
							<Search
								className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
								aria-hidden
							/>
							<Input
								type="text"
								placeholder="Search roles or permissions - e.g. delete licenses"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								data-with-leading-icon="true"
								className="h-10 border border-slate-200! bg-white pl-10!"
							/>
						</div>
					</div>

					<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex min-w-0 flex-1 flex-wrap gap-3">
							{roles.length === 0 ? (
								<div className="w-full py-4">
									<p className="text-sm text-slate-500">No roles assigned</p>
								</div>
							) : filteredRoles.length === 0 ? (
								<p className="text-sm text-slate-500">No matching roles</p>
							) : (
								filteredRoles.map((role) => (
									<div
										key={role.roleId}
										className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-2 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
									>
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-200">
											<Shield className="h-4 w-4 text-[#0f5384]" />
										</div>
										<span className="text-sm font-semibold text-slate-700">
											{role.roleName || "Role"}
										</span>
									</div>
								))
							)}
						</div>
						<div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
							<Select
								value={selectedCategory ?? "all"}
								onValueChange={(value) =>
									setSelectedCategory(value === "all" ? null : value)
								}
							>
								<SelectTrigger
									aria-label="Filter by category"
									className="h-10 w-[180px] cursor-pointer border border-slate-200! bg-white"
								>
									<SelectValue placeholder="All Categories" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Categories</SelectItem>
									{grouped.map(([category]) => (
										<SelectItem key={category} value={category}>
											{formatCategoryLabel(category)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{canManageRoles ? (
								<Button
									asChild
									className="primary-btn px-3 sm:px-4 cursor-pointer"
								>
									<Link href="/dashboard/admin/roles">
										Manage roles
										<ChevronRight className="h-4 w-4" />
									</Link>
								</Button>
							) : null}
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
					const collapsed = collapsedCategories[category] ?? true;

					return (
						<GlassCard key={category} className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<button
									type="button"
									aria-expanded={!collapsed}
									onClick={() =>
										setCollapsedCategories((prev) => ({
											...prev,
											[category]: !(prev[category] ?? true),
										}))
									}
									className="flex w-full cursor-pointer items-center justify-between rounded-md text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								>
									<span className="text-lg font-semibold sidebar-gradient-text">
										{formatCategoryLabel(category)}
									</span>
									<span className="flex items-center gap-3">
										<span className="text-xs text-slate-500">
											{grantedCount} of {items.length}
										</span>
										<ChevronDown
											className={`h-5 w-5 shrink-0 text-[#0f5384] transition-transform duration-200 ${
												collapsed ? "-rotate-90" : ""
											}`}
											aria-hidden
										/>
									</span>
								</button>
								{!collapsed && (
									<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
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
													className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
														item.granted ? "bg-green/20" : "bg-slate-100"
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
														<p className="mt-1 text-xs leading-relaxed text-slate-500">
															{item.description}
														</p>
													) : (
														<p className="mt-1 text-xs text-slate-400">
															{item.key}
														</p>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</GlassCard>
					);
				})
			)}
		</div>
	);
}
