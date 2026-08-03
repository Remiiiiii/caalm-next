"use client";

import { Link2, Save, Shield, ToggleLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { PermissionGate } from "@/components/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import type { Organization } from "@/lib/rbac/organizations";
import { fetcher } from "@/lib/swr-config";

interface OrgResponse {
	success: boolean;
	data: { organization: Organization };
}

const FEATURE_FLAGS = [
	{ key: "ai_extraction", label: "AI document extraction" },
	{ key: "advanced_analytics", label: "Advanced analytics" },
	{ key: "outlook_sync", label: "Outlook calendar sync" },
	{ key: "approvals_workflow", label: "Approvals workflow" },
	{ key: "demo_mode", label: "Demo mode banners" },
];

export default function SystemSettingsPage() {
	const { orgId } = useOrganization();
	const { toast } = useToast();
	const url = orgId
		? `/api/organizations?orgId=${encodeURIComponent(orgId)}`
		: "/api/organizations";
	const { data, isLoading, mutate } = useSWR<OrgResponse>(url, fetcher);
	const org = data?.data?.organization;

	const [features, setFeatures] = useState<string[]>([]);
	const [require2fa, setRequire2fa] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!org) return;
		const feats = org.settings?.features || [];
		setFeatures(feats);
		setRequire2fa(Boolean(org.settings?.require2fa));
	}, [org]);

	const toggleFeature = (key: string) => {
		setFeatures((prev) =>
			prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
		);
	};

	const handleSavePlatform = useCallback(async () => {
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
							maxUsers: org?.settings?.maxUsers ?? 10,
							maxDepartments: org?.settings?.maxDepartments ?? 3,
							features,
							require2fa,
						},
					}),
				},
			);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || "Save failed");
			}
			toast({ title: "System settings saved" });
			await mutate();
		} catch (error) {
			toast({
				title: "Could not save",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [orgId, org, features, require2fa, mutate, toast]);

	if (isLoading) {
		return (
			<div className="py-12 flex justify-center">
				<LoadingSpinner size="sm" label="Loading system settings…" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Tabs defaultValue="platform">
				<TabsList className="bg-white/60">
					<TabsTrigger value="platform" className="cursor-pointer">
						Platform
					</TabsTrigger>
					<TabsTrigger value="security" className="cursor-pointer">
						Security defaults
					</TabsTrigger>
					<TabsTrigger value="integrations" className="cursor-pointer">
						Integrations
					</TabsTrigger>
				</TabsList>

				<TabsContent value="platform" className="mt-4">
					<GlassCard className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6 bg-slate-50 space-y-4">
							<div className="flex items-center gap-2 mb-2">
								<ToggleLeft className="h-4 w-4 text-[#0f5384]" />
								<p className="text-sm font-medium sidebar-gradient-text">
									Feature flags
								</p>
							</div>
							<ul className="space-y-3">
								{FEATURE_FLAGS.map((flag) => (
									<li
										key={flag.key}
										className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
									>
										<Label htmlFor={flag.key} className="cursor-pointer">
											{flag.label}
										</Label>
										<Switch
											id={flag.key}
											checked={features.includes(flag.key)}
											onCheckedChange={() => toggleFeature(flag.key)}
										/>
									</li>
								))}
							</ul>
							<PermissionGate permission={PERMISSIONS.SETTINGS.EDIT}>
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4 cursor-pointer"
									disabled={saving}
									onClick={handleSavePlatform}
								>
									<Save className="h-4 w-4" />
									Save platform settings
								</Button>
							</PermissionGate>
						</CardContent>
					</GlassCard>
				</TabsContent>

				<TabsContent value="security" className="mt-4">
					<GlassCard className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6 bg-slate-50 space-y-4">
							<div className="flex items-center gap-2 mb-2">
								<Shield className="h-4 w-4 text-[#0f5384]" />
								<p className="text-sm font-medium sidebar-gradient-text">
									Security defaults
								</p>
							</div>
							<div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
								<div>
									<p className="text-sm font-medium text-slate-900">
										Require 2FA for org members
									</p>
									<p className="text-xs text-slate-500">
										Stored as org policy; users configure 2FA under Settings.
									</p>
								</div>
								<Switch checked={require2fa} onCheckedChange={setRequire2fa} />
							</div>
							<Button
								asChild
								variant="outline"
								className="primary-btn px-3 sm:px-4 cursor-pointer"
							>
								<Link href="/settings">Open user security settings</Link>
							</Button>
							<PermissionGate permission={PERMISSIONS.SETTINGS.EDIT}>
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4 cursor-pointer"
									disabled={saving}
									onClick={handleSavePlatform}
								>
									<Save className="h-4 w-4" />
									Save security defaults
								</Button>
							</PermissionGate>
						</CardContent>
					</GlassCard>
				</TabsContent>

				<TabsContent value="integrations" className="mt-4">
					<GlassCard className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6 bg-slate-50 space-y-4">
							<div className="flex items-center gap-2 mb-2">
								<Link2 className="h-4 w-4 text-[#0f5384]" />
								<p className="text-sm font-medium sidebar-gradient-text">
									Integrations overview
								</p>
							</div>
							<div className="rounded-md border border-slate-200 bg-white px-3 py-3 flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-slate-900">
										Billing &amp; Outlook
									</p>
									<p className="text-xs text-slate-500">
										Managed on the billing integrations page
									</p>
								</div>
								<Badge variant="outline" className="border-slate-200">
									Configured in billing
								</Badge>
							</div>
							<Button
								asChild
								className="primary-btn px-3 sm:px-4 cursor-pointer"
							>
								<Link href="/settings/billing?tab=integrations">
									Open integrations
								</Link>
							</Button>
						</CardContent>
					</GlassCard>
				</TabsContent>
			</Tabs>
		</div>
	);
}
