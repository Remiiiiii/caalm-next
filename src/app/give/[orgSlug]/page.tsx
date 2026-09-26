"use client";

import { Heart, Loader2 } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PublicGivePage() {
	const params = useParams<{ orgSlug: string }>();
	const search = useSearchParams();
	const orgSlug = params.orgSlug;
	const [orgName, setOrgName] = useState<string | null>(null);
	const [amount, setAmount] = useState("25");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/give/org/${encodeURIComponent(orgSlug)}`);
			if (!res.ok) {
				setOrgName(null);
				return;
			}
			const json = await res.json();
			setOrgName(json.name ?? "Organization");
		} finally {
			setLoading(false);
		}
	}, [orgSlug]);

	useEffect(() => {
		void load();
	}, [load]);

	const startCheckout = async () => {
		setSubmitting(true);
		setError(null);
		try {
			const dollars = Number(amount);
			const amountCents = Math.round(dollars * 100);
			const res = await fetch("/api/give/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orgSlug, amountCents }),
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
		<div className="min-h-screen flex items-center justify-center p-6">
			<Card className="glass-card max-w-md w-full">
				<div className="glass-card-cap" />
				<CardContent className="p-6 space-y-4">
					<div className="flex items-center gap-3">
						<Heart className="h-5 w-5 text-[#0f5384]" />
						<h1 className="text-xl font-semibold sidebar-gradient-text">
							Give to {orgName}
						</h1>
					</div>
					<p className="text-sm text-slate-600">
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
							onChange={(e) => setAmount(e.target.value)}
							className="border-[0.25px] border-slate-300"
						/>
					</div>
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
