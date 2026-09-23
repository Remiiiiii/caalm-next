"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { ConstituentType } from "@/lib/constituents/types";

type VolunteerProfile = {
	skills: string;
	availability: string;
	emergencyContact: string;
	backgroundCheckDate?: string | null;
};

export function VolunteerTab({
	constituentId,
	constituentType,
}: {
	constituentId: string;
	constituentType: ConstituentType;
}) {
	const { permissions } = usePermissions();
	const { toast } = useToast();
	const canManage = permissions.includes(PERMISSIONS.VOLUNTEERS.MANAGE);
	const showTab =
		constituentType === "volunteer" || constituentType === "member";

	const [profile, setProfile] = useState<VolunteerProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		if (!showTab) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(`/api/constituents/${constituentId}/volunteer`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Could not load volunteer profile");
			setProfile(
				body.profile ?? {
					skills: "",
					availability: "",
					emergencyContact: "",
				},
			);
		} catch (error) {
			toast({
				title: "Volunteer profile unavailable",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [constituentId, showTab, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	if (!showTab) {
		return (
			<p className="py-8 text-center text-sm text-slate-600">
				Volunteer fields apply to volunteer and member constituents only.
			</p>
		);
	}

	if (loading) {
		return <p className="text-sm text-slate-600">Loading volunteer profile…</p>;
	}

	if (!profile) return null;

	const save = async () => {
		setSaving(true);
		try {
			const res = await fetch(`/api/constituents/${constituentId}/volunteer`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(profile),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Save failed");
			setProfile(body.profile);
			toast({ title: "Volunteer profile saved" });
		} catch (error) {
			toast({
				title: "Save failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-4 pt-2">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="volunteer-skills">Skills</Label>
					<Textarea
						id="volunteer-skills"
						className="border-[0.25px] border-slate-300 min-h-[80px]"
						value={profile.skills}
						disabled={!canManage}
						onChange={(e) =>
							setProfile((p) => (p ? { ...p, skills: e.target.value } : p))
						}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="volunteer-availability">Availability</Label>
					<Textarea
						id="volunteer-availability"
						className="border-[0.25px] border-slate-300 min-h-[80px]"
						value={profile.availability}
						disabled={!canManage}
						onChange={(e) =>
							setProfile((p) =>
								p ? { ...p, availability: e.target.value } : p,
							)
						}
					/>
				</div>
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="volunteer-emergency">Emergency contact</Label>
					<Input
						id="volunteer-emergency"
						className="border-[0.25px] border-slate-300"
						value={profile.emergencyContact}
						disabled={!canManage}
						onChange={(e) =>
							setProfile((p) =>
								p ? { ...p, emergencyContact: e.target.value } : p,
							)
						}
					/>
				</div>
				{canManage ? (
					<div className="space-y-2 md:col-span-2">
						<Label htmlFor="volunteer-bg-check">Background check date</Label>
						<Input
							id="volunteer-bg-check"
							type="date"
							className="border-[0.25px] border-slate-300 max-w-xs"
							value={
								profile.backgroundCheckDate
									? profile.backgroundCheckDate.slice(0, 10)
									: ""
							}
							onChange={(e) =>
								setProfile((p) =>
									p
										? {
												...p,
												backgroundCheckDate: e.target.value || null,
											}
										: p,
								)
							}
						/>
						<p className="text-xs text-slate-500">
							Coordinator-only — not shown on public registration routes.
						</p>
					</div>
				) : null}
			</div>
			{canManage ? (
				<div className="flex justify-end">
					<Button
						className="primary-btn px-3 sm:px-4"
						disabled={saving}
						onClick={() => void save()}
					>
						<Save className="h-4 w-4" />
						Save volunteer profile
					</Button>
				</div>
			) : null}
		</div>
	);
}
