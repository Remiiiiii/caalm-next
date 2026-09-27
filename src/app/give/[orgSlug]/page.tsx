"use client";

import { Heart, Loader2 } from "lucide-react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DONATION_MIN_CENTS } from "@/lib/stripe/donations";

type GiveDesignation = { id: string; label: string };

export default function PublicGivePage() {
	const params = useParams<{ orgSlug: string }>();
	const search = useSearchParams();
	const orgSlug = params.orgSlug;
	const [orgName, setOrgName] = useState<string | null>(null);
	const [logoUrl, setLogoUrl] = useState<string | null>(null);
	const [designations, setDesignations] = useState<GiveDesignation[]>([]);
	const [amount, setAmount] = useState("25");
	const [designationId, setDesignationId] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [amountError, setAmountError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/give/org/${encodeURIComponent(orgSlug)}`);
			if (!res.ok) {
				setOrgName(null);
				return;
			}
			const json = (await res.json()) as {
				name?: string;
				logoUrl?: string | null;
				designations?: GiveDesignation[];
			};
			setOrgName(json.name ?? "Organization");
			setLogoUrl(json.logoUrl ?? null);
			setDesignations(json.designations ?? []);
		} finally {
			setLoading(false);
		}
	}, [orgSlug]);

	useEffect(() => {
		void load();
	}, [load]);

	const validateAmount = (): number | null => {
		const dollars = Number(amount);
		if (!Number.isFinite(dollars)) {
			setAmountError("Enter a valid amount");
			return null;
		}
		const amountCents = Math.round(dollars * 100);
		if (amountCents < DONATION_MIN_CENTS) {
			setAmountError("Minimum gift is $1.00");
			return null;
		}
		setAmountError(null);
		return amountCents;
	};

	const startCheckout = async () => {
		const amountCents = validateAmount();
		if (amountCents == null) return;

		setSubmitting(true);
		setError(null);
		try {
			const res = await fetch("/api/give/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgSlug,
					amountCents,
					designationId: designationId || undefined,
				}),
			});
			const json = await res.json();
			if (!res.ok || !json.url) {
				setError(json.error ?? "Could not start checkout");
				return;
			}
			window.location.href = json.url;
		} finally {
			setSubmitting(false);
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

	if (!orgName) {
		return <p className="p-8 text-slate-600">Organization not found.</p>;
	}

	if (search.get("thanks") === "1") {
		return (
			<div className="min-h-screen flex items-center justify-center p-6">
				<Card className="glass-card max-w-md w-full">
					<div className="glass-card-cap" />
					<CardContent className="p-6 text-center space-y-2">
						{logoUrl ? (
							<div className="flex justify-center mb-2">
								<Image
									src={logoUrl}
									alt=""
									width={120}
									height={48}
									className="h-12 w-auto object-contain"
									unoptimized
								/>
							</div>
						) : null}
						<p className="text-lg font-semibold sidebar-gradient-text">
							Thank you
						</p>
						<p className="text-sm text-slate-600">
							Your gift to {orgName} is being processed. A receipt will follow
							if you provided an email at checkout.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-blue-50/40 to-white">
			<Card className="glass-card max-w-md w-full">
				<div className="glass-card-cap" />
				<CardContent className="p-6 space-y-4">
					{logoUrl ? (
						<div className="flex justify-center">
							<Image
								src={logoUrl}
								alt=""
								width={160}
								height={64}
								className="h-16 w-auto object-contain"
								unoptimized
							/>
						</div>
					) : null}
					<div className="flex items-center gap-3 justify-center">
						<Heart className="h-5 w-5 text-[#0f5384]" />
						<h1 className="text-xl font-semibold sidebar-gradient-text">
							Give to {orgName}
						</h1>
					</div>
					<p className="text-sm text-slate-600 text-center">
						Secure card checkout. This page does not sign you into CAALM or change
						your subscription.
					</p>
					<div className="space-y-1">
						<Label htmlFor="amount">Amount (USD)</Label>
						<Input
							id="amount"
							type="number"
							min={1}
							step="0.01"
							value={amount}
							onChange={(e) => {
								setAmount(e.target.value);
								setAmountError(null);
							}}
							onBlur={() => {
								void validateAmount();
							}}
							className="border-[0.25px] border-slate-300"
							aria-invalid={amountError ? true : undefined}
						/>
						{amountError ? (
							<p className="text-sm text-red">{amountError}</p>
						) : null}
					</div>
					{designations.length > 0 ? (
						<div className="space-y-1">
							<Label htmlFor="designation">Designation (optional)</Label>
							<Select
								value={designationId || "__none__"}
								onValueChange={(value) =>
									setDesignationId(value === "__none__" ? "" : value)
								}
							>
								<SelectTrigger
									id="designation"
									className="border-[0.25px] border-slate-300"
								>
									<SelectValue placeholder="Where should this gift go?" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">General support</SelectItem>
									{designations.map((d) => (
										<SelectItem key={d.id} value={d.id}>
											{d.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					) : null}
					{error ? <p className="text-sm text-red">{error}</p> : null}
					<div className="flex justify-end">
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={submitting}
							onClick={() => void startCheckout()}
						>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Heart className="h-4 w-4" />
							)}
							Donate
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
