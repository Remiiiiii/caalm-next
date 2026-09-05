"use client";

import { format } from "date-fns";
import {
	AlertCircle,
	Calendar,
	Loader2,
	RefreshCw,
	Unplug,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { VscDebugConnectedCompact } from "react-icons/vsc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
	getMicrosoftCalendarIntegrationStatus,
	syncMicrosoftCalendar,
} from "@/lib/actions/calendar.actions";
import IntegrationCard from "./IntegrationCard";

interface OutlookIntegrationCardProps {
	userId: string;
}

export default function OutlookIntegrationCard({
	userId,
}: OutlookIntegrationCardProps) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);
	const [connected, setConnected] = useState(false);
	const [syncEnabled, setSyncEnabled] = useState(true);
	const [lastSync, setLastSync] = useState<string | undefined>();
	const [userEmail, setUserEmail] = useState<string | undefined>();

	const loadStatus = useCallback(async () => {
		try {
			setLoading(true);
			const status = await getMicrosoftCalendarIntegrationStatus(userId);
			setConnected(status.connected);
			setLastSync(status.lastSync);
			setSyncEnabled(status.syncEnabled);
			setUserEmail(undefined);
			setLoading(false);

			if (status.connected) {
				void fetch("/api/microsoft/user-info")
					.then((res) => (res.ok ? res.json() : null))
					.then((userData) => {
						if (userData?.userPrincipalName) {
							setUserEmail(userData.userPrincipalName);
						}
					})
					.catch(() => {
						// ignore email fetch errors
					});
			}
		} catch {
			setLoading(false);
			toast({
				title: "Error",
				description: "Failed to load Outlook integration status",
				variant: "destructive",
			});
		}
	}, [toast, userId]);

	useEffect(() => {
		loadStatus();
	}, [loadStatus]);

	const handleConnect = () => {
		window.location.href = "/api/microsoft/auth";
	};

	const handleDisconnect = async () => {
		try {
			const response = await fetch("/api/microsoft/disconnect", {
				method: "POST",
			});
			if (response.ok) {
				toast({
					title: "Disconnected",
					description: "Microsoft calendar disconnected successfully",
				});
				await loadStatus();
			} else {
				const error = await response.json();
				throw new Error(error.error || "Failed to disconnect");
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to disconnect Microsoft calendar",
				variant: "destructive",
			});
		}
	};

	const handleSync = async () => {
		try {
			setSyncing(true);
			const result = await syncMicrosoftCalendar(userId);
			if (result.success) {
				toast({ title: "Synced", description: result.message });
				await loadStatus();
			} else {
				toast({
					title: "Sync failed",
					description: result.message,
					variant: "destructive",
				});
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to sync calendar",
				variant: "destructive",
			});
		} finally {
			setSyncing(false);
		}
	};

	const handleEmergencyStop = async () => {
		try {
			const response = await fetch("/api/microsoft/disable-sync", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			const result = await response.json();
			if (result.success) {
				toast({
					title: "Emergency stop",
					description: "Sync has been disabled.",
					variant: "destructive",
				});
				await loadStatus();
			} else {
				toast({
					title: "Stop failed",
					description: result.message || "Failed to stop sync",
					variant: "destructive",
				});
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to stop sync",
				variant: "destructive",
			});
		}
	};

	if (loading) {
		return (
			<IntegrationCard
				title="Microsoft Outlook"
				description="Two-way calendar sync with Microsoft 365"
				icon={Calendar}
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
			title="Microsoft Outlook"
			description="Two-way calendar sync with Microsoft 365"
			icon={Calendar}
			status={connected ? "connected" : "disconnected"}
			meta={userEmail || null}
			lastSync={
				lastSync ? format(new Date(lastSync), "MMM d, yyyy h:mm a") : null
			}
			onConnect={handleConnect}
			onDisconnect={handleDisconnect}
			actions={
				connected ? (
					<div className="flex flex-col gap-3 w-full">
						<div className="flex items-center justify-between">
							<Label htmlFor="outlook-sync-enabled" className="text-sm">
								Automatic sync
							</Label>
							<Switch
								id="outlook-sync-enabled"
								checked={syncEnabled}
								onCheckedChange={(enabled) => {
									setSyncEnabled(enabled);
									toast({
										title: "Settings updated",
										description: `Sync ${enabled ? "enabled" : "disabled"}`,
									});
								}}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								className="btn-primary px-3 sm:px-4 cursor-pointer"
								onClick={handleSync}
								disabled={syncing}
							>
								{syncing ? (
									<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
								) : (
									<RefreshCw className="h-4 w-4" aria-hidden />
								)}
								Sync now
							</Button>
							<Button
								className="btn-delete px-3 sm:px-4 cursor-pointer"
								onClick={handleEmergencyStop}
							>
								<XCircle className="h-4 w-4" aria-hidden />
								Emergency stop
							</Button>
							<Button
								className="btn-primary px-3 sm:px-4 cursor-pointer"
								onClick={handleDisconnect}
							>
								<Unplug className="h-4 w-4" aria-hidden />
								Disconnect
							</Button>
						</div>
					</div>
				) : (
					<div className="flex flex-col gap-3 w-full">
						<div className="flex items-start gap-2 p-3 rounded-lg bg-blue/10 border border-blue/20">
							<AlertCircle className="h-4 w-4 text-[#0f5384] mt-0.5 shrink-0" />
							<p className="text-xs text-slate-700">
								Connect Outlook to sync contract and license events with your
								calendar.
							</p>
						</div>
						<Button
							className="btn-primary px-3 sm:px-4 cursor-pointer w-fit"
							onClick={handleConnect}
						>
							<VscDebugConnectedCompact className="h-4 w-4" aria-hidden />
							Connect Outlook
						</Button>
					</div>
				)
			}
		/>
	);
}
