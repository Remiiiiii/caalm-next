"use client";

import type React from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
}

function formatCategoryLabel(category: string): string {
	return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PermissionSelector: React.FC<PermissionSelectorProps> = ({
	permissions,
	selectedPermissions,
	onSelectionChange,
	disabled = false,
}) => {
	const permissionsByCategory = permissions.reduce(
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

	if (sortedCategories.length === 0) {
		return (
			<p className="py-6 text-center text-sm text-slate-600">
				No permissions available.
			</p>
		);
	}

	return (
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
							className={cn(
								"px-3 py-3 text-left hover:no-underline",
								"data-[state=open]:border-b data-[state=open]:border-white/25",
							)}
						>
							<div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
								<div className="flex min-w-0 items-center gap-2 sm:gap-3">
									<span className="truncate text-sm font-semibold text-slate-800">
										{formatCategoryLabel(category)}
									</span>
									<Badge
										variant={selectedInGroup > 0 ? "default" : "outline"}
										className={cn(
											"h-6 min-h-0 shrink-0 border-slate-200 px-2 py-0 text-xs font-semibold",
											selectedInGroup === 0
												? "bg-white/50 text-slate-600"
												: "bg-white/50 text-slate-600",
										)}
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
									return (
										<div
											key={perm.$id}
											className="flex items-start gap-3 p-3 sm:items-center"
										>
											<div className="min-w-0 flex-1">
												<Label
													htmlFor={rowId}
													className="cursor-pointer text-sm font-medium text-slate-800"
												>
													{perm.name}
												</Label>
												{perm.description ? (
													<p className="mt-0.5 text-xs text-slate-600">
														{perm.description}
													</p>
												) : null}
											</div>
											<Switch
												id={rowId}
												checked={on}
												disabled={disabled}
												onCheckedChange={() => handleToggle(perm.key)}
												className="mt-0.5 shrink-0 sm:mt-0 mr-2"
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
	);
};

export default PermissionSelector;
