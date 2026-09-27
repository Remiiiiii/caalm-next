"use client";

import { Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	channelConsentAllowed,
	LAWFUL_BASES,
} from "@/lib/constituents/consent-fields";
import type { Constituent } from "@/lib/constituents/types";

export function ConstituentConsentPanel({
	constituent,
	onUpdated,
}: {
	constituent: Constituent;
	onUpdated: (next: Constituent) => void;
}) {
	const [consentEmail, setConsentEmail] = useState(
		channelConsentAllowed(constituent.consentEmail),
	);
	const [consentSms, setConsentSms] = useState(
		channelConsentAllowed(constituent.consentSms),
	);
	const [consentMail, setConsentMail] = useState(
		channelConsentAllowed(constituent.consentMail),
	);
	const [consentPhone, setConsentPhone] = useState(
		channelConsentAllowed(constituent.consentPhone),
	);
	const [lawfulBasis, setLawfulBasis] = useState(
		constituent.lawfulBasis ?? "",
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [prefUrl, setPrefUrl] = useState<string | null>(null);

	const save = async () => {
		setSaving(true);
		setError(null);
		const res = await fetch(`/api/constituents/${constituent.$id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				consentEmail,
				consentSms,
				consentMail,
				consentPhone,
				lawfulBasis: lawfulBasis || null,
			}),
		});
		setSaving(false);
		if (!res.ok) {
			setError("Could not save consent settings");
			return;
		}
		const json = (await res.json()) as { constituent: Constituent };
		onUpdated(json.constituent);
	};

	const copyPreferenceLink = async () => {
		setError(null);
		const res = await fetch(
			`/api/constituents/${constituent.$id}/preference-token`,
			{ method: "POST" },
		);
		if (!res.ok) {
			setError("Could not create preference link");
			return;
		}
		const json = (await res.json()) as { url: string };
		setPrefUrl(json.url);
		await navigator.clipboard.writeText(json.url);
	};

	return (
		<Card className="glass-card mb-6">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 space-y-4">
				<p className="text-sm font-medium sidebar-gradient-text">
					Channel consent
				</p>
				<p className="text-xs text-slate-600">
					Per-channel opt-out is checked before receipts and appeals. Do-not-contact
					still blocks every channel.
				</p>
				<div className="grid gap-3 sm:grid-cols-2">
					{(
						[
							["Email", consentEmail, setConsentEmail],
							["SMS", consentSms, setConsentSms],
							["Phone", consentPhone, setConsentPhone],
							["Mail", consentMail, setConsentMail],
						] as const
					).map(([label, value, setter]) => (
						<div key={label} className="flex items-center justify-between gap-2">
							<Label>{label}</Label>
							<Switch checked={value} onCheckedChange={setter} />
						</div>
					))}
				</div>
				<div className="space-y-1">
					<Label>Lawful basis</Label>
					<Select
						value={lawfulBasis || "__none__"}
						onValueChange={(v) => setLawfulBasis(v === "__none__" ? "" : v)}
					>
						<SelectTrigger className="border-[0.25px] border-slate-300">
							<SelectValue placeholder="Optional" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__none__">Not set</SelectItem>
							{LAWFUL_BASES.map((b) => (
								<SelectItem key={b} value={b}>
									{b.replace(/_/g, " ")}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				{error ? <p className="text-sm text-red">{error}</p> : null}
				{prefUrl ? (
					<p className="text-xs text-slate-600 break-all">
						Preference link copied: {prefUrl}
					</p>
				) : null}
				<div className="flex flex-wrap justify-end gap-3">
					<Button type="button" variant="outline" onClick={() => void copyPreferenceLink()}>
						Copy preference link
					</Button>
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						disabled={saving}
						onClick={() => void save()}
					>
						<Shield className="h-4 w-4" />
						Save consent
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
