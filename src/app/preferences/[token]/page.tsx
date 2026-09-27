"use client";

import { Loader2, Shield } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { LAWFUL_BASES } from "@/lib/constituents/consent-fields";

type PreferenceState = {
	displayName: string;
	doNotContact: boolean;
	consentEmail: boolean;
	consentSms: boolean;
	consentMail: boolean;
	consentPhone: boolean;
	lawfulBasis?: string;
};

export default function PreferenceCenterPage() {
	const params = useParams<{ token: string }>();
	const token = params.token;
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [notFound, setNotFound] = useState(false);
	const [state, setState] = useState<PreferenceState | null>(null);
	const [saved, setSaved] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setNotFound(false);
		const res = await fetch(`/api/preferences/${encodeURIComponent(token)}`);
		if (res.status === 404) {
			setNotFound(true);
			setState(null);
			setLoading(false);
			return;
		}
		if (!res.ok) {
			setLoading(false);
			return;
		}
		const json = (await res.json()) as PreferenceState;
		setState(json);
		setLoading(false);
	}, [token]);

	useEffect(() => {
		void load();
	}, [load]);

	const save = async () => {
		if (!state) return;
		setSaving(true);
		setSaved(false);
		const res = await fetch(`/api/preferences/${encodeURIComponent(token)}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(state),
		});
		setSaving(false);
		if (res.ok) {
			setSaved(true);
			const json = (await res.json()) as PreferenceState;
			setState(json);
		}
	};

	if (loading) {
		return (
			<p className="p-8 text-slate-600 flex items-center gap-2">
				<Loader2 className="h-4 w-4 animate-spin" />
				Loading…
			</p>
		);
	}

	if (notFound || !state) {
		return (
			<div className="min-h-screen flex items-center justify-center p-6">
				<p className="text-slate-600">This preference link is invalid or expired.</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-blue-50/40 to-white">
			<Card className="glass-card max-w-lg w-full">
				<div className="glass-card-cap" />
				<CardContent className="p-6 space-y-5">
					<div className="flex items-center gap-3">
						<Shield className="h-5 w-5 text-[#0f5384]" />
						<h1 className="text-xl font-semibold sidebar-gradient-text">
							Communication preferences
						</h1>
					</div>
					<p className="text-sm text-slate-600">
						Hi {state.displayName}. Choose how we may reach you. This page does
						not sign you into CAALM staff tools.
					</p>
					<div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
						{(
							[
								["consentEmail", "Email"],
								["consentSms", "SMS / text"],
								["consentPhone", "Phone calls"],
								["consentMail", "Postal mail"],
							] as const
						).map(([key, label]) => (
							<div
								key={key}
								className="flex items-center justify-between gap-3"
							>
								<Label htmlFor={key}>{label}</Label>
								<Switch
									id={key}
									checked={state[key]}
									onCheckedChange={(checked) =>
										setState((s) => (s ? { ...s, [key]: checked } : s))
									}
								/>
							</div>
						))}
						<div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200">
							<Label htmlFor="dnc">Do not contact (all channels)</Label>
							<Switch
								id="dnc"
								checked={state.doNotContact}
								onCheckedChange={(checked) =>
									setState((s) =>
										s ? { ...s, doNotContact: checked } : s,
									)
								}
							/>
						</div>
					</div>
					<div className="space-y-1">
						<Label htmlFor="lawful">Lawful basis (optional)</Label>
						<Select
							value={state.lawfulBasis ?? "__none__"}
							onValueChange={(value) =>
								setState((s) =>
									s
										? {
												...s,
												lawfulBasis:
													value === "__none__" ? undefined : value,
											}
										: s,
								)
							}
						>
							<SelectTrigger
								id="lawful"
								className="border-[0.25px] border-slate-300"
							>
								<SelectValue placeholder="Select basis" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">Not set</SelectItem>
								{LAWFUL_BASES.map((basis) => (
									<SelectItem key={basis} value={basis}>
										{basis.replace(/_/g, " ")}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{saved ? (
						<p className="text-sm text-green">Preferences saved.</p>
					) : null}
					<div className="flex justify-end">
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={saving}
							onClick={() => void save()}
						>
							{saving ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Shield className="h-4 w-4" />
							)}
							Save preferences
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
