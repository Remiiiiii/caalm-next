"use client";

import { format } from "date-fns";
import {
	Calendar,
	Loader2,
	Mail,
	RefreshCw,
	Unplug,
	XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { VscDebugConnectedCompact } from "react-icons/vsc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStepUp } from "@/contexts/StepUpContext";
import { useToast } from "@/hooks/use-toast";
import {
	getMicrosoftCalendarIntegrationStatus,
	syncMicrosoftCalendar,
} from "@/lib/actions/calendar.actions";
import { cn } from "@/lib/utils";
import IntegrationCard from "./IntegrationCard";

const MICROSOFT_ICON = "/assets/icons/company-icons/microsoft.svg";

type FeatureTab = "calendar" | "mail";

interface OutlookIntegrationCardProps {
	userId: string;
}

export default function OutlookIntegrationCard({
	userId,
}: OutlookIntegrationCardProps) {
	const { toast } = useToast();
	const { ensureStepUp } = useStepUp();
	const searchParams = useSearchParams();
	const [feature, setFeature] = useState<FeatureTab>("calendar");
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);
	const [calendarConnected, setCalendarConnected] = useState(false);
	const [mailConnected, setMailConnected] = useState(false);
	const [syncEnabled, setSyncEnabled] = useState(true);
	const [lastSync, setLastSync] = useState<string | undefined>();
	const [calendarEmail, setCalendarEmail] = useState<string | undefined>();
	const [mailEmail, setMailEmail] = useState<string | undefined>();

	const loadStatus = useCallback(async () => {
		try {
			setLoading(true);
			const [calendarStatus, mailRes] = await Promise.all([
				getMicrosoftCalendarIntegrationStatus(userId),
				fetch("/api/microsoft/mail/status").then(async (res) => {
					const data = await res.json().catch(() => ({}));
					return { ok: res.ok, data };
				}),
			]);

			setCalendarConnected(calendarStatus.connected);
			setLastSync(calendarStatus.lastSync);
			setSyncEnabled(calendarStatus.syncEnabled);
			setCalendarEmail(undefined);

			if (mailRes.ok) {
				setMailConnected(Boolean(mailRes.data.connected));
				setMailEmail(mailRes.data.email || undefined);
			} else {
				setMailConnected(false);
				setMailEmail(undefined);
			}

			if (calendarStatus.connected) {
				void fetch("/api/microsoft/user-info")
					.then((res) => (res.ok ? res.json() : null))
					.then((userData) => {
						if (userData?.userPrincipalName) {
							setCalendarEmail(userData.userPrincipalName);
						}
					})
					.catch(() => {
						// ignore email fetch errors
					});
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to load Microsoft 365 integration status",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [toast, userId]);

	useEffect(() => {
		void loadStatus();
	}, [loadStatus]);

	useEffect(() => {
		const mailParam = searchParams?.get("outlook_mail");
		if (!mailParam) return;

		setFeature("mail");
		if (mailParam === "connected") {
			const email = searchParams?.get("email");
			toast({
				title: "Outlook Mail connected",
				description: email
					? `Connected as ${decodeURIComponent(email)}`
					: "Your Microsoft 365 mailbox is ready in CAALM.",
			});
			void loadStatus();
		} else {
			const isBadSecret =
				mailParam.includes("invalid_client_secret") ||
				mailParam.includes("token_exchange");
			toast({
				title: "Outlook Mail connection failed",
				description: isBadSecret
					? "Microsoft rejected the app secret. In Azure → App registration → Certificates & secrets, copy the Secret Value (not Secret ID) into MICROSOFT_CLIENT_SECRET, then restart the app."
					: `Could not finish setup (${mailParam.replace(/_/g, " ")}).`,
				variant: "destructive",
			});
		}

		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("outlook_mail");
			url.searchParams.delete("email");
			window.history.replaceState({}, "", url.toString());
		}
	}, [searchParams, toast, loadStatus]);

	const handleConnectCalendar = () => {
		window.location.href = "/api/microsoft/auth";
	};

	const handleConnectMail = () => {
		window.location.href = "/api/microsoft/mail/auth";
	};

	const handleDisconnectCalendar = async () => {
		if (!(await ensureStepUp())) return;
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

	const handleDisconnectMail = async () => {
		if (!(await ensureStepUp())) return;
		try {
			const response = await fetch("/api/microsoft/mail/disconnect", {
				method: "POST",
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to disconnect");
			}
			toast({
				title: "Disconnected",
				description: "Outlook Mail was disconnected from CAALM.",
			});
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

	const activeConnected =
		feature === "calendar" ? calendarConnected : mailConnected;
	const activeEmail = feature === "calendar" ? calendarEmail : mailEmail;

	const featureSwitch = (
		<div
			className="grid w-full grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1"
			role="tablist"
			aria-label="Microsoft 365 feature"
		>
			<button
				type="button"
				role="tab"
				aria-selected={feature === "calendar"}
				className={cn(
					"flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200",
					feature === "calendar"
						? "bg-white text-[#0f5384] shadow-sm"
						: "text-slate-600 hover:text-slate-800",
				)}
				onClick={() => setFeature("calendar")}
			>
				<Calendar className="h-3.5 w-3.5" aria-hidden />
				Calendar
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={feature === "mail"}
				className={cn(
					"flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200",
					feature === "mail"
						? "bg-white text-[#0f5384] shadow-sm"
						: "text-slate-600 hover:text-slate-800",
				)}
				onClick={() => setFeature("mail")}
			>
				<Mail className="h-3.5 w-3.5" aria-hidden />
				Mail
			</button>
		</div>
	);

	const actionsShell = (children: ReactNode) => (
		<div className="flex w-full flex-col gap-3">
			{featureSwitch}
			<div className="flex w-full flex-col gap-3">{children}</div>
		</div>
	);

	if (loading) {
		return (
			<IntegrationCard
				title="Microsoft 365"
				description="Calendar sync and business email in one place"
				iconSrc={MICROSOFT_ICON}
				status="connecting"
				info="Checking your Microsoft 365 connection…"
				actions={actionsShell(
					<div className="flex w-full flex-1 items-center justify-center gap-2 py-2 text-sm text-slate-600">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading…
					</div>,
				)}
			/>
		);
	}

	const calendarActions = calendarConnected ? (
		<>
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
			<Button
				className="btn-primary w-full cursor-pointer px-3 sm:px-4"
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
				className="btn-delete w-full cursor-pointer px-3 sm:px-4"
				onClick={handleEmergencyStop}
			>
				<XCircle className="h-4 w-4" aria-hidden />
				Emergency stop
			</Button>
			<Button
				className="btn-primary w-full cursor-pointer px-3 sm:px-4"
				onClick={handleDisconnectCalendar}
			>
				<Unplug className="h-4 w-4" aria-hidden />
				Disconnect calendar
			</Button>
		</>
	) : (
		<Button
			className="btn-primary w-full cursor-pointer px-3 sm:px-4"
			onClick={handleConnectCalendar}
		>
			<VscDebugConnectedCompact className="h-4 w-4" aria-hidden />
			Connect calendar
		</Button>
	);

	const mailActions = mailConnected ? (
		<>
			<p className="text-xs text-slate-600">
				Open the mail icon in the dashboard header to read your Outlook inbox
				inside CAALM.
			</p>
			<Button
				className="btn-primary w-full cursor-pointer px-3 sm:px-4"
				onClick={handleDisconnectMail}
			>
				<Unplug className="h-4 w-4" aria-hidden />
				Disconnect mail
			</Button>
		</>
	) : (
		<Button
			className="btn-primary w-full cursor-pointer px-3 sm:px-4"
			onClick={handleConnectMail}
		>
			<VscDebugConnectedCompact className="h-4 w-4" aria-hidden />
			Connect mail
		</Button>
	);

	return (
		<IntegrationCard
			title="Microsoft 365"
			description="Calendar sync and business email in one place"
			iconSrc={MICROSOFT_ICON}
			status={activeConnected ? "connected" : "disconnected"}
			meta={activeEmail || null}
			lastSync={
				feature === "calendar" && lastSync
					? format(new Date(lastSync), "MMM d, yyyy h:mm a")
					: null
			}
			info={
				feature === "calendar"
					? calendarConnected
						? "Contract and license events sync with your Outlook calendar. Use Sync now to pull changes immediately."
						: "Connect Calendar to sync contract and license events with Outlook."
					: mailConnected
						? "Your Microsoft 365 mailbox is linked. Use the header mail icon to open the Outlook Mail panel."
						: "Connect Mail to read your Microsoft 365 inbox inside CAALM. Calendar and Mail use separate permissions."
			}
			actions={actionsShell(
				feature === "calendar" ? calendarActions : mailActions,
			)}
		/>
	);
}
