"use client";

import { Building2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { PermissionGate } from "@/components/PermissionGate";
import { OrgStructureManager } from "@/components/settings/OrgStructureManager";
import { TimezoneSelect } from "@/components/settings/TimezoneSelect";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { Organization } from "@/lib/rbac/organizations";
import { fetcher } from "@/lib/swr-config";

interface OrgResponse {
	success: boolean;
	data: { organization: Organization };
}

export default function OrganizationSettingsPage() {
	const { orgId, refreshOrgProfile } = useOrganization();
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { toast } = useToast();
	const canEdit = permissions.includes(PERMISSIONS.SETTINGS.EDIT);

	const url = orgId
		? `/api/organizations?orgId=${encodeURIComponent(orgId)}`
		: "/api/organizations";

	const { data, isLoading, mutate } = useSWR<OrgResponse>(url, fetcher);
	const org = data?.data?.organization;

	const [name, setName] = useState("");
	const [domain, setDomain] = useState("");
	const [timezone, setTimezone] = useState("America/New_York");
	const [websiteUrl, setWebsiteUrl] = useState("");
	const [maxUsers, setMaxUsers] = useState(10);
	const [maxDepartments, setMaxDepartments] = useState(3);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!org) return;
		setName(org.name || "");
		setDomain(org.domain || "");
		setTimezone(
			typeof org.settings?.timezone === "string" && org.settings.timezone
				? org.settings.timezone
				: "America/New_York",
		);
		setWebsiteUrl(
			typeof org.settings?.websiteUrl === "string"
				? org.settings.websiteUrl
				: "",
		);
		setMaxUsers(org.settings?.maxUsers ?? 10);
		setMaxDepartments(org.settings?.maxDepartments ?? 3);
	}, [org]);

	const handleSaveProfile = useCallback(async () => {
		if (!canEdit) return;
		setSaving(true);
		try {
			const res = await fetch(
				orgId
					? `/api/organizations?orgId=${encodeURIComponent(orgId)}`
					: "/api/organizations",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name,
						domain: domain || null,
						settings: {
							maxUsers: org?.settings?.maxUsers ?? 10,
							maxDepartments: org?.settings?.maxDepartments ?? 3,
							features: org?.settings?.features || [],
							timezone,
							websiteUrl: websiteUrl || null,
						},
					}),
				},
			);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || "Save failed");
			}
			toast({ title: "Organization profile saved" });
			await mutate();
			await refreshOrgProfile();
		} catch (error) {
			toast({
				title: "Could not save",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [
		canEdit,
		orgId,
		name,
		domain,
		timezone,
		websiteUrl,
		org,
		mutate,
		refreshOrgProfile,
		toast,
	]);

	const handleSaveLimits = useCallback(async () => {
		if (!canEdit) return;
		setSaving(true);
		try {
			const res = await fetch(
				orgId
					? `/api/organizations?orgId=${encodeURIComponent(orgId)}`
					: "/api/organizations",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						settings: {
							maxUsers,
							maxDepartments,
							features: org?.settings?.features || [],
							timezone: org?.settings?.timezone,
							websiteUrl: org?.settings?.websiteUrl,
						},
					}),
				},
			);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || "Save failed");
			}
			toast({ title: "Limits saved" });
			await mutate();
		} catch (error) {
			toast({
				title: "Could not save limits",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [canEdit, orgId, maxUsers, maxDepartments, org, mutate, toast]);

	if (permissionsLoading || isLoading) {
		return (
			<div className="py-12 flex justify-center">
				<LoadingSpinner size="sm" label="Loading organization…" />
			</div>
		);
	}

	if (!org) {
		return <p className="text-slate-600">Organization could not be loaded.</p>;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-2">
				<Building2 className="h-5 w-5 text-[#0f5384]" />
				<div>
					<p className="text-sm text-slate-600">
						Tier:{" "}
						<span className="font-medium text-slate-700 capitalize">
							{org.subscriptionTier}
						</span>
						{" · "}
						Status:{" "}
						<span className="font-medium text-slate-700 capitalize">
							{org.status}
						</span>
					</p>
				</div>
			</div>

			<Tabs defaultValue="profile">
				<TabsList className="bg-white/60">
					<TabsTrigger value="profile" className="cursor-pointer">
						Profile
					</TabsTrigger>
					<TabsTrigger value="limits" className="cursor-pointer">
						Limits
					</TabsTrigger>
					<TabsTrigger value="structure" className="cursor-pointer">
						Org structure
					</TabsTrigger>
				</TabsList>

				<TabsContent value="profile" className="mt-4">
					<GlassCard className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6 space-y-4 bg-slate-50">
							<div className="space-y-2">
								<Label htmlFor="org-name">Organization name</Label>
								<Input
									id="org-name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									disabled={!canEdit}
									className="bg-white !border-[0.25px] !border-solid !border-slate-200"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="org-domain">Email domain</Label>
								<Input
									id="org-domain"
									value={domain}
									onChange={(e) => setDomain(e.target.value)}
									disabled={!canEdit}
									placeholder="example.org"
									className="bg-white !border-[0.25px] !border-solid !border-slate-200"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="org-timezone">Organization timezone</Label>
								<TimezoneSelect
									id="org-timezone"
									value={timezone}
									onValueChange={setTimezone}
									disabled={!canEdit}
								/>
								<p className="text-xs text-slate-500">
									Used for date and time display across CAALM, plus scheduled
									jobs (readiness, digests, expiry notices) at the local 9:00
									window.
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="org-website">Public website URL</Label>
								<Input
									id="org-website"
									value={websiteUrl}
									onChange={(e) => setWebsiteUrl(e.target.value)}
									disabled={!canEdit}
									placeholder="https://cfcecares.org"
									className="bg-white !border-[0.25px] !border-solid !border-slate-200"
								/>
								<p className="text-xs text-slate-500">
									Optional bounded crawl for readiness packets (informational;
									not scored).
								</p>
							</div>
							<PermissionGate permission={PERMISSIONS.SETTINGS.EDIT}>
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4 cursor-pointer"
									disabled={saving || !name.trim()}
									onClick={handleSaveProfile}
								>
									<Save className="h-4 w-4" />
									Save profile
								</Button>
							</PermissionGate>
						</CardContent>
					</GlassCard>
				</TabsContent>

				<TabsContent value="limits" className="mt-4">
					<GlassCard className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6 space-y-4 bg-slate-50">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="max-users">Max users</Label>
									<Input
										id="max-users"
										type="number"
										min={1}
										value={maxUsers}
										onChange={(e) => setMaxUsers(Number(e.target.value) || 1)}
										disabled={!canEdit}
										className="bg-white !border-[0.25px] !border-solid !border-slate-200"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="max-depts">Max departments</Label>
									<Input
										id="max-depts"
										type="number"
										min={1}
										value={maxDepartments}
										onChange={(e) =>
											setMaxDepartments(Number(e.target.value) || 1)
										}
										disabled={!canEdit}
										className="bg-white !border-[0.25px] !border-solid !border-slate-200"
									/>
								</div>
							</div>
							<PermissionGate permission={PERMISSIONS.SETTINGS.EDIT}>
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4 cursor-pointer"
									disabled={saving}
									onClick={handleSaveLimits}
								>
									<Save className="h-4 w-4" />
									Save limits
								</Button>
							</PermissionGate>
						</CardContent>
					</GlassCard>
				</TabsContent>

				<TabsContent value="structure" className="mt-4">
					<OrgStructureManager
						orgId={org.$id}
						canEdit={canEdit}
						maxDepartments={maxDepartments}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
