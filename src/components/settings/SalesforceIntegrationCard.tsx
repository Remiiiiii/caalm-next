"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import IntegrationCard from "./IntegrationCard";

function SalesforceGlyph({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			aria-hidden="true"
			fill="currentColor"
		>
			<path d="M10.1 7.2c.6-1.2 1.8-2 3.2-2 1.5 0 2.8.9 3.4 2.2.5-.3 1.1-.4 1.7-.4 1.9 0 3.4 1.5 3.4 3.4 0 1.9-1.5 3.4-3.4 3.4H5.7C3.6 13.8 2 12.2 2 10.1c0-2 1.5-3.6 3.5-3.7.4-1.3 1.6-2.3 3-2.3 1 0 1.9.5 2.5 1.2.3-.6.7-1.1 1.1-1.5-.4-.3-.8-.5-1.3-.6C9.3 2.6 7.4 3.8 6.7 5.4 6.5 5.4 6.3 5.3 6.1 5.3 3.7 5.3 1.8 7.2 1.8 9.6c0 .4.1.8.2 1.1C.8 11.4 0 12.7 0 14.2 0 16.4 1.8 18.2 4 18.2h13.6c3.5 0 6.4-2.9 6.4-6.4 0-3.2-2.4-5.9-5.5-6.3C17.7 3.4 15.6 2 13.3 2c-2.1 0-3.9 1.1-4.9 2.8-.4-.1-.8-.1-1.2-.1-.2 0-.4 0-.6.1.9-1.2 1.9-2.1 3.5-2.6Z" />
		</svg>
	);
}

interface SalesforceIntegrationCardProps {
	orgId: string;
	locked: boolean;
	onViewPlans: () => void;
}

export default function SalesforceIntegrationCard({
	orgId,
	locked,
	onViewPlans,
}: SalesforceIntegrationCardProps) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(!locked);
	const [requesting, setRequesting] = useState(false);
	const [requested, setRequested] = useState(false);

	const loadStatus = useCallback(async () => {
		if (locked || !orgId) {
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			const res = await fetch(
				`/api/crm/salesforce/status?orgId=${encodeURIComponent(orgId)}`,
				{ headers: { "x-org-id": orgId } },
			);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to load status");
			setRequested(Boolean(data.requested));
		} catch {
			setRequested(false);
		} finally {
			setLoading(false);
		}
	}, [locked, orgId]);

	useEffect(() => {
		void loadStatus();
	}, [loadStatus]);

	const handleRequest = async () => {
		try {
			setRequesting(true);
			const res = await fetch("/api/crm/salesforce/request-setup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-org-id": orgId,
				},
				body: JSON.stringify({ orgId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Request failed");
			setRequested(true);
			toast({
				title: "Setup requested",
				description:
					"Salesforce needs a guided setup call. We enable it after sandbox access.",
			});
		} catch (error) {
			toast({
				title: "Request failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setRequesting(false);
		}
	};

	if (locked) {
		return (
			<IntegrationCard
				title="Salesforce"
				description="Opportunity stage → CAALM draft. Sales-led setup only."
				icon={SalesforceGlyph}
				status="locked"
				lockedHint="Available on the Enterprise plan. Setup starts after a discovery call."
				onConnect={onViewPlans}
			/>
		);
	}

	if (loading) {
		return (
			<IntegrationCard
				title="Salesforce"
				description="Opportunity stage → CAALM draft. Sales-led setup only."
				icon={SalesforceGlyph}
				status="connecting"
				actions={
					<div className="flex items-center gap-2 text-sm text-slate-600">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading…
					</div>
				}
			/>
		);
	}

	return (
		<IntegrationCard
			title="Salesforce"
			description="Opportunity stage → CAALM draft. Sales-led setup only."
			icon={SalesforceGlyph}
			status={requested ? "connecting" : "disconnected"}
			actions={
				<div className="flex flex-col gap-3 w-full">
					<div className="flex items-start gap-2 p-3 rounded-lg bg-blue/10 border border-blue/20">
						<AlertCircle className="h-4 w-4 text-[#0f5384] mt-0.5" />
						<p className="text-xs text-slate-700">
							Salesforce is not self-serve. Request setup and we wire your
							sandbox after a paid Enterprise engagement.
						</p>
					</div>
					{requested ? (
						<p className="text-xs text-slate-600">
							Setup requested. CAALM will follow up for sandbox access.
						</p>
					) : (
						<Button
							className="btn-primary px-3 sm:px-4 cursor-pointer w-fit"
							onClick={handleRequest}
							disabled={requesting}
						>
							{requesting ? (
								<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
							) : null}
							Request setup
						</Button>
					)}
				</div>
			}
		/>
	);
}
