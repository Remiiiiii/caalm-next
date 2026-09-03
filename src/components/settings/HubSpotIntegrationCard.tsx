"use client";

import { format } from "date-fns";
import { AlertCircle, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import HubSpotConfigDialog from "./HubSpotConfigDialog";
import IntegrationCard from "./IntegrationCard";

function HubSpotGlyph({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			aria-hidden="true"
			fill="currentColor"
		>
			<path d="M17.3 10.2V7.4a2.4 2.4 0 1 0-1.7 0v2.8a3.6 3.6 0 0 0-2.1 1.3l-3.3-2.4a2.6 2.6 0 1 0-1.3 1.3l3.3 2.4a3.6 3.6 0 1 0 5.1-5.1ZM6.2 8.6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm10.2-3.3a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6ZM12 16.7a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8Z" />
		</svg>
	);
}

interface HubSpotIntegrationCardProps {
	orgId: string;
	locked: boolean;
	demoLocked: boolean;
	onViewPlans: () => void;
}

export default function HubSpotIntegrationCard({
	orgId,
	locked,
	demoLocked,
	onViewPlans,
}: HubSpotIntegrationCardProps) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(!locked);
	const [syncing, setSyncing] = useState(false);
	const [connected, setConnected] = useState(false);
	const [configOpen, setConfigOpen] = useState(false);
	const [displayName, setDisplayName] = useState<string | null>(null);
	const [lastSync, setLastSync] = useState<string | null>(null);
	const [lastError, setLastError] = useState<string | null>(null);
	const [pipelineId, setPipelineId] = useState("");
	const [triggerStageId, setTriggerStageId] = useState("");

	const loadStatus = useCallback(async () => {
		if (locked || !orgId) {
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			const res = await fetch(
				`/api/crm/hubspot/status?orgId=${encodeURIComponent(orgId)}`,
				{ headers: { "x-org-id": orgId } },
			);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to load status");
			setConnected(Boolean(data.connected));
			setDisplayName(data.displayName || data.portalId || null);
			setLastSync(data.lastSyncAt || null);
			setLastError(data.lastError || null);
			setPipelineId(data.config?.pipelineId || "");
			setTriggerStageId(data.config?.triggerStageId || "");
		} catch (error) {
			toast({
				title: "HubSpot status unavailable",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [locked, orgId, toast]);

	useEffect(() => {
		void loadStatus();
	}, [loadStatus]);

	const handleConnect = () => {
		window.location.href = `/api/hubspot/auth?orgId=${encodeURIComponent(orgId)}`;
	};

	const handleDisconnect = async () => {
		try {
			const res = await fetch("/api/hubspot/disconnect", {
				method: "POST",
				headers: {
					"x-org-id": orgId,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ orgId }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Disconnect failed");
			}
			toast({ title: "Disconnected", description: "HubSpot was disconnected." });
			await loadStatus();
		} catch (error) {
			toast({
				title: "Disconnect failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		}
	};

	const handleSync = async () => {
		try {
			setSyncing(true);
			const res = await fetch("/api/crm/hubspot/sync", {
				method: "POST",
				headers: {
					"x-org-id": orgId,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ orgId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Sync failed");
			toast({
				title: "Sync complete",
				description: `Created ${data.created ?? 0} draft(s); ${data.reused ?? 0} already linked.`,
			});
			await loadStatus();
		} catch (error) {
			toast({
				title: "Sync failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSyncing(false);
		}
	};

	if (locked || demoLocked) {
		return (
			<IntegrationCard
				title="HubSpot"
				description="Create a CAALM draft when a HubSpot deal hits a stage."
				icon={HubSpotGlyph}
				status="locked"
				lockedHint={
					demoLocked
						? "Disabled in the demo sandbox."
						: "Available on Growth and Enterprise plans."
				}
				onConnect={demoLocked ? undefined : onViewPlans}
			/>
		);
	}

	if (loading) {
		return (
			<IntegrationCard
				title="HubSpot"
				description="Create a CAALM draft when a HubSpot deal hits a stage."
				icon={HubSpotGlyph}
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
		<>
			<IntegrationCard
				title="HubSpot"
				description="Create a CAALM draft when a HubSpot deal hits a stage."
				icon={HubSpotGlyph}
				status={connected ? "connected" : "disconnected"}
				meta={displayName}
				lastSync={
					lastSync ? format(new Date(lastSync), "MMM d, yyyy h:mm a") : null
				}
				onConnect={handleConnect}
				actions={
					connected ? (
						<div className="flex flex-col gap-3 w-full">
							{lastError ? (
								<p className="text-xs text-red">{lastError}</p>
							) : (
								<p className="text-xs text-slate-600">
									{triggerStageId
										? "Trigger stage is set. Move a deal there or sync now."
										: "Configure a pipeline and trigger stage next."}
								</p>
							)}
							<div className="flex flex-wrap gap-2">
								<Button
									size="sm"
									variant="outline"
									className="cursor-pointer"
									onClick={() => setConfigOpen(true)}
								>
									<Settings2 className="h-4 w-4" />
									Configure
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="cursor-pointer"
									onClick={handleSync}
									disabled={syncing || !triggerStageId}
								>
									{syncing ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<RefreshCw className="h-4 w-4" />
									)}
									Sync now
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="cursor-pointer"
									onClick={handleDisconnect}
								>
									Disconnect
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-3 w-full">
							<div className="flex items-start gap-2 p-3 rounded-lg bg-blue/10 border border-blue/20">
								<AlertCircle className="h-4 w-4 text-[#0f5384] mt-0.5" />
								<p className="text-xs text-slate-700">
									Connect HubSpot, pick a deal stage, and CAALM opens a draft
									when that stage is reached. HubSpot Free CRM is enough.
								</p>
							</div>
							<Button
								className="primary-btn px-3 sm:px-4 cursor-pointer w-fit"
								onClick={handleConnect}
							>
								Connect HubSpot
							</Button>
						</div>
					)
				}
			/>
			<HubSpotConfigDialog
				open={configOpen}
				onOpenChange={setConfigOpen}
				orgId={orgId}
				pipelineId={pipelineId}
				triggerStageId={triggerStageId}
				onSaved={() => void loadStatus()}
			/>
		</>
	);
}
