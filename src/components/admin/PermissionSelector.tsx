"use client";

import type React from "react";
import { useMemo, useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SENSITIVE_PERMISSIONS } from "@/constants/permissions";
import type { PermissionKey } from "@/constants/permissions";
import { findSodConflicts } from "@/lib/rbac/sod-rules";
import { cn } from "@/lib/utils";

interface Permission {
	$id: string;
	key: string;
	name: string;
	category: string;
	description?: string;
}

interface PermissionSelectorProps {
	permissions: Permission[];
	selectedPermissions: Set<string>;
	onSelectionChange: (selected: Set<string>) => void;
	disabled?: boolean;
	/** When true, SoD conflicts are shown as errors (custom roles) */
	enforceSod?: boolean;
}

function formatCategoryLabel(category: string): string {
	return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const sensitiveSet = new Set(SENSITIVE_PERMISSIONS);

const PermissionSelector: React.FC<PermissionSelectorProps> = ({
	permissions,
	selectedPermissions,
	onSelectionChange,
	disabled = false,
	enforceSod = true,
}) => {
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return permissions;
		return permissions.filter((p) => {
			const hay = `${p.name} ${p.key} ${p.description || ""} ${p.category}`.toLowerCase();
			return hay.includes(q);
		});
	}, [permissions, search]);

	const permissionsByCategory = filtered.reduce(
		(acc: Record<string, Permission[]>, perm) => {
			const category = perm.category || "other";
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push(perm);
			return acc;
		},
		{},
	);

	const sortedCategories = Object.entries(permissionsByCategory).sort(
		([a], [b]) => a.localeCompare(b),
	);

	const sodConflicts = useMemo(
		() =>
			findSodConflicts([
				...selectedPermissions,
			] as PermissionKey[]),
		[selectedPermissions],
	);

	const handleToggle = (permissionKey: string) => {
		if (disabled) return;

		const newSelected = new Set(selectedPermissions);
		if (newSelected.has(permissionKey)) {
			newSelected.delete(permissionKey);
		} else {
			newSelected.add(permissionKey);
		}
		onSelectionChange(newSelected);
	};

	const handleCategoryToggle = (category: string, select: boolean) => {
		if (disabled) return;

		const newSelected = new Set(selectedPermissions);
		const categoryPermissions = permissionsByCategory[category] || [];

		categoryPermissions.forEach((perm) => {
			if (select) {
				newSelected.add(perm.key);
			} else {
				newSelected.delete(perm.key);
			}
		});
		onSelectionChange(newSelected);
	};

	const isCategorySelected = (category: string) => {
		const categoryPermissions = permissionsByCategory[category] || [];
		return (
			categoryPermissions.length > 0 &&
			categoryPermissions.every((perm) => selectedPermissions.has(perm.key))
		);
	};

	const isCategoryPartiallySelected = (category: string) => {
		const categoryPermissions = permissionsByCategory[category] || [];
		const selectedCount = categoryPermissions.filter((perm) =>
			selectedPermissions.has(perm.key),
		).length;
		return selectedCount > 0 && selectedCount < categoryPermissions.length;
	};

	const groupSelectedCount = (category: string) => {
		const categoryPermissions = permissionsByCategory[category] || [];
		return categoryPermissions.filter((perm) =>
			selectedPermissions.has(perm.key),
		).length;
	};

	return (
		<div className="space-y-3">
			<Input
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				placeholder="Search permissions by name, key, or category…"
				className="bg-white/60"
				aria-label="Search permissions"
			/>

			{sodConflicts.length > 0 ? (
				<div
					className={cn( "rounded-md border px-3 py-2 text-sm", enforceSod ? "border-red/30 bg-red/10 text-slate-700" : "border-orange/30 bg-orange/10 text-slate-700", )}
					role="status"
				>
					<p className="font-medium">
						{enforceSod
							? "Separation of duties conflict"
							: "Separation of duties warning"}
					</p>
					<ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-700">
						{sodConflicts.map(([a, b]) => (
							<li key={`${a}-${b}`}>
								{a} cannot be combined with {b} on the same custom role
							</li>
						))}
					</ul>
				</div>
			) : null}

			{sortedCategories.length === 0 ? (
				<p className="py-6 text-center text-sm text-slate-600">
					{search.trim()
						? "No permissions match your search."
						: "No permissions available."}
				</p>
			) : (
				<Accordion type="multiple" className="space-y-2">
					{sortedCategories.map(([category, perms]) => {
						const allSelected = isCategorySelected(category);
						const partiallySelected = isCategoryPartiallySelected(category);
						const selectedInGroup = groupSelectedCount(category);
						const totalInGroup = perms.length;

						return (
							<AccordionItem
								key={category}
								value={category}
								className="rounded-lg border border-white/35 bg-white/15 px-1 backdrop-blur-sm"
							>
								<AccordionTrigger
									className={cn( "px-3 py-3 text-left hover:no-underline", "data-[state=open]:border-b data-[state=open]:border-white/25", )}
								>
									<div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
										<div className="flex min-w-0 items-center gap-2 sm:gap-3">
											<span className="truncate text-sm font-semibold text-slate-800">
												{formatCategoryLabel(category)}
											</span>
											<Badge
												variant={selectedInGroup > 0 ? "default" : "outline"}
												className={cn( "h-6 min-h-0 shrink-0 border-slate-200 px-2 py-0 text-xs font-semibold", "bg-white/50 text-slate-600", partiallySelected && "ring-1 ring-[#0f5384]/30", )}
											>
												{selectedInGroup}/{totalInGroup}
											</Badge>
										</div>
										<div
											className="flex shrink-0 items-center gap-2"
											onClick={(e) => e.stopPropagation()}
											onPointerDown={(e) => e.stopPropagation()}
											onKeyDown={(e) => e.stopPropagation()}
										>
											{allSelected ? (
												<button
													type="button"
													className="text-xs font-medium text-[#0f5384] hover:underline"
													disabled={disabled}
													onClick={() => handleCategoryToggle(category, false)}
												>
													Deselect All
												</button>
											) : (
												<button
													type="button"
													className="text-xs font-medium text-[#0f5384] hover:underline"
													disabled={disabled}
													onClick={() => handleCategoryToggle(category, true)}
												>
													Select All
												</button>
											)}
											<Switch
												checked={allSelected}
												disabled={disabled || totalInGroup === 0}
												onCheckedChange={(checked) =>
													handleCategoryToggle(category, checked)
												}
												aria-label={
													allSelected
														? `Clear all ${formatCategoryLabel(category)} permissions`
														: `Select all ${formatCategoryLabel(category)} permissions`
												}
											/>
										</div>
									</div>
								</AccordionTrigger>
								<AccordionContent className="px-3 pb-2 pt-0">
									<div className="divide-y divide-white/20 rounded-md border border-white/20 bg-white/10">
										{perms.map((perm) => {
											const rowId = `perm-${perm.$id}`;
											const on = selectedPermissions.has(perm.key);
											const sensitive = sensitiveSet.has(perm.key);
											return (
												<div
													key={perm.$id}
													className="flex items-start gap-3 p-3 sm:items-center"
												>
													<div className="min-w-0 flex-1">
														<div className="flex flex-wrap items-center gap-2">
															<Label
																htmlFor={rowId}
																className="cursor-pointer text-sm font-medium text-slate-800"
															>
																{perm.name}
															</Label>
															{sensitive ? (
																<Badge
																	variant="outline"
																	className="border-red/30 bg-red/10 text-[10px] font-semibold uppercase tracking-wide text-red"
																>
																	Sensitive
																</Badge>
															) : null}
														</div>
														{perm.description ? (
															<p className="mt-0.5 text-xs text-slate-600">
																{perm.description}
															</p>
														) : null}
														<p className="mt-0.5 text-[10px] text-slate-500">
															{perm.key}
														</p>
													</div>
													<Switch
														id={rowId}
														checked={on}
														disabled={disabled}
														onCheckedChange={() => handleToggle(perm.key)}
														className="mt-0.5 mr-2 shrink-0 sm:mt-0"
														aria-label={`${on ? "Revoke" : "Grant"} ${perm.name}`}
													/>
												</div>
											);
										})}
									</div>
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>
			)}
		</div>
	);
};

export default PermissionSelector;
