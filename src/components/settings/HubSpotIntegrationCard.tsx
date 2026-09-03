"use client";

import { format } from "date-fns";
import {
	AlertCircle,
	Info,
	Loader2,
	RefreshCw,
	Settings2,
	Unplug,
	Waypoints,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { VscDebugConnectedCompact } from "react-icons/vsc";
import { Button } from "@/components/ui/button";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import HubSpotConfigDialog from "./HubSpotConfigDialog";
import IntegrationCard from "./IntegrationCard";
import type { CrmFieldMap, CrmIntegrationConfig } from "@/lib/crm/types";
import { DEFAULT_CRM_FIELD_MAP } from "@/lib/crm/types";

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
	const [fieldMap, setFieldMap] = useState<CrmFieldMap>({
		...DEFAULT_CRM_FIELD_MAP,
	});

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
			setFieldMap({
				...DEFAULT_CRM_FIELD_MAP,
				...(data.config?.fieldMap || {}),
			});
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

	const overflowMenu = connected ? (
		<DropdownMenu>
			<DropdownMenuTrigger
				className="shad-no-focus rounded-full transition-colors hover:bg-white/30 cursor-pointer"
				aria-label="Actions for HubSpot"
			>
				<Image src="/assets/icons/dots.svg" alt="" width={34} height={34} />
			</DropdownMenuTrigger>
			<AppDropdownMenuContent align="end">
				<AppDropdownMenuItem
					icon={Settings2}
					onClick={() => setConfigOpen(true)}
				>
					Configure
				</AppDropdownMenuItem>
				<AppDropdownMenuItem
					icon={RefreshCw}
					disabled={syncing || !triggerStageId}
					onClick={() => void handleSync()}
				>
					{syncing ? "Syncing…" : "Sync now"}
				</AppDropdownMenuItem>
				<DropdownMenuSeparator />
				<AppDropdownMenuItem
					icon={Unplug}
					tone="danger"
					onClick={() => void handleDisconnect()}
				>
					Disconnect
				</AppDropdownMenuItem>
			</AppDropdownMenuContent>
		</DropdownMenu>
	) : null;

	if (locked || demoLocked) {
		return (
			<IntegrationCard
				title="HubSpot"
				description="Create a CAALM draft when a HubSpot deal hits a stage."
				icon={Waypoints}
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
				icon={Waypoints}
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
				icon={Waypoints}
				status={connected ? "connected" : "disconnected"}
				meta={displayName}
				lastSync={
					lastSync ? format(new Date(lastSync), "MMM d, yyyy h:mm a") : null
				}
				menu={overflowMenu}
				onConnect={handleConnect}
				actions={
					connected ? (
						<div className="flex flex-col gap-3 w-full">
							{lastError ? (
								<div className="flex items-start gap-2 p-3 rounded-lg bg-red/10 border border-red/20">
									<AlertCircle className="h-4 w-4 text-red mt-0.5 shrink-0" />
									<p className="text-xs text-slate-700">{lastError}</p>
								</div>
							) : (
								<div
									className={`flex items-start gap-2 p-3 rounded-lg border ${
										triggerStageId
											? "bg-green/10 border-green/20"
											: "bg-blue/10 border-blue/20"
									}`}
								>
									<Info className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
									<p className="text-xs text-slate-700">
										{triggerStageId
											? "Trigger stage is set. Move a deal there, or sync now to pull it in immediately."
											: "Configure a pipeline and trigger stage next."}
									</p>
								</div>
							)}
						</div>
					) : (
						<div className="flex flex-col gap-3 w-full">
							<div className="flex items-start gap-2 p-3 rounded-lg bg-blue/10 border border-blue/20">
								<AlertCircle className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
								<p className="text-xs text-slate-700">
									Connect HubSpot, pick a deal stage, and CAALM opens a draft
									when that stage is reached. HubSpot Free CRM is enough.
								</p>
							</div>
							<Button
								className="btn-primary px-3 sm:px-4 cursor-pointer w-fit"
								onClick={handleConnect}
							>
								<VscDebugConnectedCompact className="h-4 w-4" aria-hidden />
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
				fieldMap={fieldMap}
				onSaved={(config: CrmIntegrationConfig) => {
					// Apply save payload locally — skip HubSpot status round-trip
					setPipelineId(config.pipelineId || "");
					setTriggerStageId(config.triggerStageId || "");
					setFieldMap({
						...DEFAULT_CRM_FIELD_MAP,
						...(config.fieldMap || {}),
					});
					setLastError(null);
				}}
			/>
		</>
	);
}
