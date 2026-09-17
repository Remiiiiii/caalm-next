"use client";

import { EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";

function formatRemaining(expiresAt: string, now: number): string {
	const ms = new Date(expiresAt).getTime() - now;
	if (ms <= 0) return "0:00";
	const totalSec = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSec / 60);
	const seconds = totalSec % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ImpersonationBanner() {
	const { status, isImpersonating, endSession } = useImpersonation();
	const [now, setNow] = useState(() => Date.now());
	const [ending, setEnding] = useState(false);

	useEffect(() => {
		if (!isImpersonating) return;
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, [isImpersonating]);

	if (!isImpersonating || !status.target) return null;

	const remaining = status.expiresAt
		? formatRemaining(status.expiresAt, now)
		: "";

	return (
		<div
			role="status"
			className="flex w-full items-center justify-between gap-3 border-b border-orange/20 bg-orange/15 px-4 py-2 text-slate-800 sm:px-6"
			data-testid="impersonation-banner"
		>
			<p className="min-w-0 text-sm font-medium">
				You&apos;re viewing as {status.target.fullName}
				{status.target.email ? (
					<span className="text-slate-600"> · {status.target.email}</span>
				) : null}
				<span className="text-slate-600"> · read-only</span>
				{remaining ? (
					<span className="tabular-nums text-slate-600">
						{" "}
						· ends in {remaining}
					</span>
				) : null}
			</p>
			<Button
				type="button"
				className="primary-btn shrink-0 px-3 sm:px-4"
				data-impersonation-allow=""
				disabled={ending}
				onClick={() => {
					setEnding(true);
					void endSession().catch(() => setEnding(false));
				}}
			>
				<EyeOff className="h-4 w-4" />
				End session
			</Button>
		</div>
	);
}
