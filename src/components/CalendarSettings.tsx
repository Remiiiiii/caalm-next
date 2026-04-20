"use client";

import { format } from "date-fns";
import {
	AlertCircle,
	Calendar,
	CheckCircle,
	Clock,
	ExternalLink,
	Loader2,
	RefreshCw,
	XCircle,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { EscalationRulesManager } from "@/components/EscalationRulesManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
	getMicrosoftCalendarIntegration,
	hasMicrosoftCalendarIntegration,
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

	// Load integration status
	useEffect(() => {
		loadIntegrationStatus();
	}, [loadIntegrationStatus]);

	const loadIntegrationStatus = async () => {
		try {
			setIntegrationStatus((prev) => ({ ...prev, loading: true }));

			const [hasIntegration, integration] = await Promise.all([
				hasMicrosoftCalendarIntegration(userId),
				getMicrosoftCalendarIntegration(userId),
			]);

			// Fetch user email from Microsoft Graph if integration exists
			let userEmail: string | undefined;
			if (integration && hasIntegration) {
				try {
					const userResponse = await fetch("/api/microsoft/user-info");
					if (userResponse.ok) {
						const userData = await userResponse.json();
						userEmail = userData.userPrincipalName;
					}
				} catch (error) {
					console.warn("Could not fetch user email:", error);
				}
			}

			setIntegrationStatus({
				connected: hasIntegration,
				lastSync: integration?.last_sync,
				syncEnabled: integration?.sync_enabled ?? true,
				loading: false,
				userEmail,
			});
		} catch (error) {
			console.error("Error loading integration status:", error);
			setIntegrationStatus((prev) => ({ ...prev, loading: false }));
			toast({
				title: "Error",
				description: "Failed to load calendar integration status",
				variant: "destructive",
			});
		}
	};

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
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Calendar Integration
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin" />
						<span className="ml-2">Loading...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Calendar className="h-5 w-5" />
					Calendar Integration
				</CardTitle>
				<CardDescription>
					Connect your Microsoft Outlook calendar for seamless synchronization
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Microsoft Outlook Integration */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
								<Calendar className="h-4 w-4 text-blue-600" />
							</div>
							<div>
								<h3 className="font-medium">Microsoft Outlook</h3>
								<p className="text-sm text-muted-foreground">
									Two-way calendar sync
								</p>
							</div>
						</div>
						<Badge
							variant={integrationStatus.connected ? "default" : "secondary"}
							className={
								integrationStatus.connected ? "bg-green-100 text-green-800" : ""
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
						<div className="space-y-3">
							{/* Connected Email Account */}
							{integrationStatus.userEmail && (
								<div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
									<h4 className="text-sm font-medium text-gray-700 mb-2">
										Email account
									</h4>
									<div className="flex items-center gap-3">
										<Image
											src="/assets/images/365.png"
											alt="Microsoft 365"
											width={32}
											height={32}
											className="rounded"
										/>
										<div>
											<p className="text-sm font-medium text-gray-900">
												{integrationStatus.userEmail}
											</p>
											<p className="text-xs text-gray-500">Microsoft 365</p>
										</div>
									</div>
								</div>
							)}

							{/* Last Sync */}
							{integrationStatus.lastSync && (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Clock className="h-4 w-4" />
									<span>
										Last sync:{" "}
										{format(
											new Date(integrationStatus.lastSync),
											"MMM d, yyyy h:mm a",
										)}
									</span>
								</div>
							)}

							{/* Sync Controls */}
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<Label htmlFor="sync-enabled" className="text-sm">
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
						</div>
					) : (
						<div className="space-y-3">
							<div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
								<AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
								<div className="text-sm text-blue-800">
									<p className="font-medium">Connect your Outlook calendar</p>
									<p className="text-blue-600">
										Sync events between CAALM and Microsoft Outlook
										automatically
									</p>
								</div>
							</div>

							<div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
								<AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
								<div className="text-sm text-amber-800">
									<p className="font-medium">
										Important: Use a Work/School Account
									</p>
									<p className="text-amber-600">
										Personal Microsoft accounts (hotmail.com, outlook.com) have
										limited calendar access. Please use a work or school
										Microsoft account for full functionality.
									</p>
								</div>
							</div>

							<Button onClick={handleConnect} className="w-full" size="sm">
								<ExternalLink className="h-4 w-4" />
								Connect Microsoft Outlook
							</Button>
						</div>
					)}
				</div>

				<Separator />

				{/* Escalation Rules */}
				<div className="space-y-3">
					<h3 className="font-medium text-sm">Notification Escalation</h3>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
								<AlertCircle className="h-4 w-4 text-blue-600" />
							</div>
							<div>
								<h4 className="font-medium text-sm">Escalation Rules</h4>
								<p className="text-xs text-muted-foreground">
									Configure automatic notification escalation
								</p>
							</div>
						</div>
						<EscalationRulesManager />
					</div>
				</div>

				<Separator />

				{/* Future Integrations */}
				<div className="space-y-3">
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

				{/* Help Text */}
				<div className="text-xs text-muted-foreground space-y-1">
					<p>• Events created in CAALM will appear in your Outlook calendar</p>
					<p>• Events from Outlook will be imported into CAALM</p>
					<p>• Changes are synchronized automatically when enabled</p>
				</div>
			</CardContent>
		</Card>
	);
}
