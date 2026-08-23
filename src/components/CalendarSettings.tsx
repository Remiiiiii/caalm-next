"use client";

import { format } from "date-fns";
import {
	Calendar,
	CheckCircle,
	Clock,
	ExternalLink,
	Loader2,
	RefreshCw,
	XCircle,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { EscalationRulesManager } from "@/components/EscalationRulesManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
	getMicrosoftCalendarIntegrationStatus,
	syncMicrosoftCalendar,
} from "@/lib/actions/calendar.actions";

interface CalendarSettingsProps {
	userId: string;
	onClose?: () => void;
}

interface IntegrationStatus {
	connected: boolean;
	lastSync?: string;
	syncEnabled: boolean;
	loading: boolean;
	userEmail?: string;
}

export default function CalendarSettings({
	userId,
	onClose,
}: CalendarSettingsProps) {
	const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>(
		{
			connected: false,
			syncEnabled: true,
			loading: true,
		},
	);
	const [syncing, setSyncing] = useState(false);
	const { toast } = useToast();

	const loadIntegrationStatus = useCallback(async () => {
		if (!userId) return;

		try {
			setIntegrationStatus((prev) => ({ ...prev, loading: true }));

			const status = await getMicrosoftCalendarIntegrationStatus(userId);
			setIntegrationStatus({
				connected: status.connected,
				lastSync: status.lastSync,
				syncEnabled: status.syncEnabled,
				loading: false,
			});

			// Email is nice-to-have. Graph + token refresh must not block the dialog.
			if (status.connected) {
				void fetch("/api/microsoft/user-info")
					.then((res) => (res.ok ? res.json() : null))
					.then((userData) => {
						if (!userData?.userPrincipalName) return;
						setIntegrationStatus((prev) => ({
							...prev,
							userEmail: userData.userPrincipalName,
						}));
					})
					.catch((error) => {
						console.warn("Could not fetch user email:", error);
					});
			}
		} catch (error) {
			console.error("Error loading integration status:", error);
			setIntegrationStatus((prev) => ({ ...prev, loading: false }));
			toast({
				title: "Error",
				description: "Failed to load calendar integration status",
				variant: "destructive",
			});
		}
	}, [userId]);

	// Load once per user. useCallback keeps this function stable so the
	// effect does not re-run after every setState (that loop hits React's
	// "Maximum update depth exceeded" limit).
	useEffect(() => {
		loadIntegrationStatus();
	}, [loadIntegrationStatus]);

	const handleConnect = () => {
		// Redirect to Microsoft OAuth endpoint
		// The API route will handle authentication validation and redirect to Microsoft
		window.location.href = "/api/microsoft/auth";
	};

	const handleDisconnect = async () => {
		try {
			const response = await fetch("/api/microsoft/disconnect", {
				method: "POST",
			});

			if (response.ok) {
				toast({
					title: "Success",
					description: "Microsoft calendar disconnected successfully",
				});
				await loadIntegrationStatus();
			} else {
				const error = await response.json();
				throw new Error(error.error || "Failed to disconnect");
			}
		} catch (error) {
			console.error("Error disconnecting calendar:", error);
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
				// Check if there are errors to show details
				const resultData = result as any;
				let description = result.message;

				// If there are errors in the result, include error details
				if (resultData.result?.errors && resultData.result.errors.length > 0) {
					const errorDetails = resultData.result.errors
						.map((err: any) => `${err.operation}: ${err.error}`)
						.join("\n");
					description = `${result.message}\n\nErrors:\n${errorDetails}`;

					toast({
						title: "Success with Errors",
						description: description,
						variant: "destructive",
					});
				} else {
					toast({
						title: "Success",
						description: result.message,
					});
				}

				await loadIntegrationStatus();
			} else {
				toast({
					title: "Sync Failed",
					description: result.message,
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error syncing calendar:", error);
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
				headers: {
					"Content-Type": "application/json",
				},
			});

			const result = await response.json();

			if (result.success) {
				toast({
					title: "Emergency Stop",
					description:
						"Sync has been immediately disabled. No new events will be created.",
					variant: "destructive",
				});
				await loadIntegrationStatus();
			} else {
				toast({
					title: "Stop Failed",
					description: result.message || "Failed to stop sync",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Emergency stop error:", error);
			toast({
				title: "Emergency Stop Error",
				description: "Failed to stop sync",
				variant: "destructive",
			});
		}
	};

	const toggleSyncEnabled = async (enabled: boolean) => {
		try {
			// This would need to be implemented in the API
			// For now, just update local state
			setIntegrationStatus((prev) => ({ ...prev, syncEnabled: enabled }));

			toast({
				title: "Settings Updated",
				description: `Sync ${enabled ? "enabled" : "disabled"}`,
			});
		} catch (error) {
			console.error("Error toggling sync:", error);
			toast({
				title: "Error",
				description: "Failed to update sync settings",
				variant: "destructive",
			});
		}
	};

	if (integrationStatus.loading) {
		return (
			<div className="flex items-center justify-center py-6">
				<Loader2 className="h-5 w-5 animate-spin text-slate-500" />
				<span className="ml-2 text-sm text-slate-600">Loading...</span>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
						<Calendar className="h-4 w-4 text-[#0f5384]" />
					</div>
					<div className="min-w-0">
						<h3 className="text-sm font-medium text-slate-700">
							Microsoft Outlook
						</h3>
						<p className="text-xs text-slate-500">Two-way calendar sync</p>
					</div>
				</div>
				<Badge
					className={
						integrationStatus.connected
							? "h-auto py-1 text-xs rounded-full pointer-events-none bg-green/10 text-green border-green/20 hover:bg-green/10"
							: "h-auto py-1 text-xs rounded-full pointer-events-none bg-red/10 text-red border-red/20 hover:bg-red/10"
					}
				>
					{integrationStatus.connected ? (
						<>
							<CheckCircle className="h-3 w-3 mr-1" /> Connected
						</>
					) : (
						<>
							<XCircle className="h-3 w-3 mr-1" /> Not Connected
						</>
					)}
				</Badge>
			</div>

			{integrationStatus.connected ? (
				<div className="space-y-2.5">
					{integrationStatus.userEmail ? (
						<div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
							<Image
								src="/assets/images/365.png"
								alt="Microsoft 365"
								width={20}
								height={20}
								className="rounded shrink-0"
							/>
							<p className="text-xs font-medium text-slate-700 truncate">
								{integrationStatus.userEmail}
							</p>
						</div>
					) : null}

					{integrationStatus.lastSync ? (
						<div className="flex items-center gap-1.5 text-xs text-slate-500">
							<Clock className="h-3.5 w-3.5" />
							<span>
								Last sync:{" "}
								{format(
									new Date(integrationStatus.lastSync),
									"MMM d, yyyy h:mm a",
								)}
							</span>
						</div>
					) : null}

					<div className="flex items-center justify-between">
						<Label htmlFor="sync-enabled" className="text-sm text-slate-700">
							Automatic sync
						</Label>
						<Switch
							id="sync-enabled"
							checked={integrationStatus.syncEnabled}
							onCheckedChange={toggleSyncEnabled}
						/>
					</div>

					<div className="flex gap-2">
						<Button
							onClick={handleSync}
							disabled={syncing}
							size="sm"
							variant="outline"
							className="flex-1"
						>
							{syncing ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" /> Syncing...
								</>
							) : (
								<>
									<RefreshCw className="h-4 w-4" /> Sync Now
								</>
							)}
						</Button>
						<Button
							onClick={handleEmergencyStop}
							size="sm"
							variant="destructive"
							className="flex-1"
						>
							<XCircle className="h-4 w-4" /> Emergency Stop
						</Button>
						<Button
							onClick={handleDisconnect}
							size="sm"
							variant="outline"
							className="flex-1"
						>
							Disconnect
						</Button>
					</div>
				</div>
			) : (
				<div className="space-y-2.5 pt-4">
					<p className="text-xs text-slate-600">
						Use a work or school Microsoft account. Personal hotmail/outlook
						accounts have limited calendar access.
					</p>
					<div className="flex justify-center pb-4">
						<Button
							onClick={handleConnect}
							className="primary-btn w-auto! px-3 sm:px-4"
							size="sm"
						>
							<ExternalLink className="h-4 w-4" />
							Connect Microsoft Outlook
						</Button>
					</div>
				</div>
			)}

			<div className="pt-4 border-t border-slate-200 space-y-3">
				<div className="min-w-0">
					<h4 className="text-sm font-medium text-slate-700">
						Escalation Rules
					</h4>
					<p className="text-xs text-slate-500">
						Automatic notification escalation
					</p>
				</div>
				<div className="flex justify-center">
					<EscalationRulesManager />
				</div>
			</div>

			<div className="space-y-3 pt-4 border-t border-slate-200">
				<h3 className="font-medium text-sm text-muted-foreground">
					Coming Soon
				</h3>
				<div className="flex items-center gap-2 opacity-50">
					<div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
						<Calendar className="h-4 w-4 text-gray-400" />
					</div>
					<div>
						<h4 className="font-medium text-sm">Google Calendar</h4>
						<p className="text-xs text-muted-foreground">
							Two-way calendar sync
						</p>
					</div>
					<Badge variant="secondary" className="ml-auto">
						Soon
					</Badge>
				</div>
			</div>
		</div>
	);
}
