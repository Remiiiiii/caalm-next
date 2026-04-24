"use client";

import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

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

	return (
		<ScrollArea className="h-[600px] pr-3">
			<div className="space-y-4">
				{Object.entries(permissionsByCategory).map(([category, perms]) => {
					const allSelected = isCategorySelected(category);
					const partiallySelected = isCategoryPartiallySelected(category);

					return (
						<Card
							key={category}
							className="border border-white/35 bg-white/20 shadow-sm backdrop-blur-sm"
						>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between gap-3">
									<CardTitle className="text-sm font-semibold capitalize text-slate-700">
										{category.replace("_", " ")}
									</CardTitle>
									<Checkbox
										checked={allSelected}
										ref={(el) => {
											if (el) {
												el.indeterminate = partiallySelected;
											}
										}}
										onCheckedChange={(checked) =>
											handleCategoryToggle(category, checked === true)
										}
										disabled={disabled}
									/>
								</div>
							</CardHeader>
							<CardContent className="space-y-2">
								{perms.map((perm) => (
									<div
										key={perm.$id}
										className="flex items-start space-x-2 rounded-md border border-transparent p-2 transition-colors hover:border-white/30 hover:bg-white/25"
									>
										<Checkbox
											id={perm.$id}
											checked={selectedPermissions.has(perm.key)}
											onCheckedChange={() => handleToggle(perm.key)}
											disabled={disabled}
											className="mt-1"
										/>
										<div className="min-w-0 flex-1">
											<Label
												htmlFor={perm.$id}
												className="cursor-pointer text-sm font-medium text-slate-800"
											>
												{perm.name}
											</Label>
											{perm.description && (
												<p className="mt-1 text-xs text-slate-600">
													{perm.description}
												</p>
											)}
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</ScrollArea>
	);
};

export default PermissionSelector;
