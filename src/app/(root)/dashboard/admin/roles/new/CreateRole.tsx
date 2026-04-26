"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import PermissionSelector from "@/components/admin/PermissionSelector";
import { PermissionGate } from "@/components/PermissionGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";

interface Permission {
	$id: string;
	key: string;
	name: string;
	category: string;
	description?: string;
}

function adminQuery(orgId: string | null | undefined) {
	const q = new URLSearchParams();
	if (orgId?.trim()) q.set("orgId", orgId.trim());
	const s = q.toString();
	return s ? `?${s}` : "";
}

const CreateRole = () => {
	const [permissions, setPermissions] = useState<Permission[]>([]);
	const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
		new Set(),
	);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
	});
	const { toast } = useToast();
	const router = useRouter();
	const { orgId } = useOrganization();

	const selectionSummary = useMemo(() => {
		const count = selectedPermissions.size;
		const groups = new Set<string>();
		for (const p of permissions) {
			if (selectedPermissions.has(p.key)) {
				groups.add(p.category || "other");
			}
		}
		return { count, groupCount: groups.size };
	}, [permissions, selectedPermissions]);

	const fetchPermissions = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch(
				`/api/admin/permissions${adminQuery(orgId)}`,
			);
			const data = await response.json();

			if (data.success) {
				setPermissions(data.data.all || []);
			} else {
				toast({
					title: "Error",
					description: data.error || "Failed to fetch permissions",
					variant: "destructive",
				});
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to fetch permissions",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [orgId, toast]);

	useEffect(() => {
		void fetchPermissions();
	}, [fetchPermissions]);

	const handleSave = async () => {
		if (!formData.name.trim()) {
			toast({
				title: "Error",
				description: "Role name is required",
				variant: "destructive",
			});
			return;
		}

		try {
			setSaving(true);
			const response = await fetch(`/api/admin/roles${adminQuery(orgId)}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(orgId?.trim() ? { "x-org-id": orgId.trim() } : {}),
				},
				body: JSON.stringify({
					name: formData.name,
					description: formData.description,
					orgId: orgId || null,
					permissionKeys: Array.from(selectedPermissions),
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast({
					title: "Success",
					description: "Role created successfully",
				});
				router.push("/dashboard/admin/roles");
			} else {
				toast({
					title: "Error",
					description: data.error || "Failed to create role",
					variant: "destructive",
				});
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to create role",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const summaryPhrase = (() => {
		const { count, groupCount } = selectionSummary;
		const p = count === 1 ? "permission" : "permissions";
		const g = groupCount === 1 ? "group" : "groups";
		return `Selected: ${count} ${p} across ${groupCount} ${g}`;
	})();

	if (loading) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
				<div className="py-16 text-center text-slate-600">
					Loading permissions…
				</div>
			</div>
		);
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
			<Button
				variant="ghost"
				size="sm"
				className="mb-4 shrink-0 text-slate-600 hover:text-slate-900 bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
				onClick={() => router.push("/dashboard/admin/roles")}
			>
				<ArrowLeft className="h-4 w-4" />
				Back
			</Button>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
					<div>
						<h1 className="h1 capitalize sidebar-gradient-text">Create role</h1>
						<p className="mt-2 text-sm text-slate-600 sm:text-base">
							Define a name and description, then choose permissions from your
							organization's catalog.
						</p>
					</div>
				</div>
			</div>

			<PermissionGate
				permission={PERMISSIONS.USERS.ASSIGN_ROLES}
				fallback={
					<p className="body-2 py-10 text-center text-slate-600">
						You don&apos;t have permission to create roles.
					</p>
				}
			>
				<div className="mt-8 space-y-8">
					<section className="space-y-3">
						<div>
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								Role details
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								These fields identify the role for admins and in assignment
								pickers.
							</p>
						</div>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-end">
							<div className="space-y-2">
								<Label htmlFor="name" className="text-slate-700">
									Name *
								</Label>
								<Input
									id="name"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									placeholder="e.g. Project manager"
									className="border-white/40 bg-white/40"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="description" className="text-slate-700">
									Description
								</Label>
								<Input
									id="description"
									value={formData.description}
									onChange={(e) =>
										setFormData({
											...formData,
											description: e.target.value,
										})
									}
									placeholder="Short summary of what this role is for"
									className="border-white/40 bg-white/40"
								/>
							</div>
						</div>
					</section>

					<section className="space-y-3">
						<div>
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								Permissions
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Permissions control what actions users assigned to a role can
								perform within the system. Only toggled items will be granted.
							</p>
						</div>
						<Card className="glass-card w-full">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="max-h-[70vh] overflow-y-auto pr-2">
									<PermissionSelector
										permissions={permissions}
										selectedPermissions={selectedPermissions}
										onSelectionChange={setSelectedPermissions}
										disabled={saving}
									/>
								</div>
							</CardContent>
						</Card>
					</section>

					<footer className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-slate-600">{summaryPhrase}</p>
						<Button
							type="button"
							onClick={() => void handleSave()}
							disabled={saving || !formData.name.trim()}
							className="primary-btn w-full sm:w-auto sm:shrink-0"
						>
							<Save className="h-4 w-4" />
							{saving ? "Creating role…" : "Create role"}
						</Button>
					</footer>
				</div>
			</PermissionGate>
		</div>
	);
};

export default CreateRole;
