"use client";

import { Check, Loader2, ScanLine } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type CheckInSuccess = {
	firstName: string;
	ticketTypeName: string;
};

export function EventCheckInClient() {
	const { toast } = useToast();
	const [token, setToken] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [lastSuccess, setLastSuccess] = useState<CheckInSuccess | null>(null);

	const submit = async () => {
		const trimmed = token.trim();
		if (!trimmed) {
			toast({ title: "Paste or scan a token first", variant: "destructive" });
			return;
		}
		setSubmitting(true);
		setLastSuccess(null);
		try {
			const res = await fetch("/api/events/check-in", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: trimmed }),
			});
			const body = await res.json().catch(() => ({}));
			if (res.status === 409 && body.reason === "already_used") {
				toast({
					title: "Already checked in",
					description: body.error || "This token was already used.",
				});
				return;
			}
			if (!res.ok) {
				throw new Error(body.error || "Check-in failed");
			}
			setLastSuccess({
				firstName: body.firstName || "Guest",
				ticketTypeName: body.ticketTypeName || "Ticket",
			});
			setToken("");
			toast({ title: "Checked in" });
		} catch (error) {
			toast({
				title: "Check-in failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="max-w-xl">
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<div className="space-y-2">
						<Label htmlFor="check-in-token">Registration token</Label>
						<Input
							id="check-in-token"
							className="border-[0.25px] border-slate-300"
							value={token}
							onChange={(e) => setToken(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") void submit();
							}}
							placeholder="Scan QR or paste token"
							autoComplete="off"
						/>
					</div>
					<div className="flex justify-end">
						<Button
							className="primary-btn px-3 sm:px-4"
							disabled={submitting}
							onClick={() => void submit()}
						>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<ScanLine className="h-4 w-4" />
							)}
							Check in
						</Button>
					</div>
					{lastSuccess ? (
						<div className="rounded-lg border border-green/20 bg-green/10 p-4 flex items-start gap-3">
							<Check className="h-5 w-5 text-green shrink-0 mt-0.5" />
							<div>
								<p className="text-sm font-medium text-slate-700">
									{lastSuccess.firstName}
								</p>
								<p className="text-xs text-slate-600">
									{lastSuccess.ticketTypeName}
								</p>
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
