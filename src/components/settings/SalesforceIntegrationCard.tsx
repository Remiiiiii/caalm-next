"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import IntegrationCard from "./IntegrationCard";

const SALESFORCE_ICON = "/assets/icons/company-icons/salesforce.svg";

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
				iconSrc={SALESFORCE_ICON}
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
				iconSrc={SALESFORCE_ICON}
				status="connecting"
				info="Checking Salesforce setup status…"
				actions={
					<div className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600">
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
			iconSrc={SALESFORCE_ICON}
			status={requested ? "connecting" : "disconnected"}
			info={
				requested
					? "Setup requested. CAALM will follow up for sandbox access."
					: "Salesforce is not self-serve. Request setup and we wire your sandbox after a paid Enterprise engagement."
			}
			actions={
				requested ? undefined : (
					<Button
						className="btn-primary w-full cursor-pointer px-3 sm:px-4"
						onClick={handleRequest}
						disabled={requesting}
					>
						{requesting ? (
							<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
						) : null}
						Request setup
					</Button>
				)
			}
		/>
	);
}
