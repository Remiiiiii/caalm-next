"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStepUp } from "@/contexts/StepUpContext";
import { useToast } from "@/hooks/use-toast";
import IntegrationCard from "./IntegrationCard";

interface GmailIntegrationCardProps {
	userId: string;
}

export default function GmailIntegrationCard({
	userId: _userId,
}: GmailIntegrationCardProps) {
	const { toast } = useToast();
	const { ensureStepUp } = useStepUp();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [connected, setConnected] = useState(false);
	const [userEmail, setUserEmail] = useState<string | undefined>();

	const GMAIL_ICON = "/assets/icons/company-icons/gmail.svg";
	const loadStatus = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/gmail/status");
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Failed to load Gmail status");
			}
			setConnected(Boolean(data.connected));
			setUserEmail(data.email || undefined);
		} catch (error) {
			toast({
				title: "Gmail status unavailable",
				description: error instanceof Error ? error.message : "Try again later",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		void loadStatus();
	}, [loadStatus]);

	useEffect(() => {
		const gmailParam = searchParams?.get("gmail");
		if (!gmailParam) return;

		if (gmailParam === "connected") {
			const email = searchParams?.get("email");
			toast({
				title: "Gmail connected",
				description: email
					? `Connected as ${decodeURIComponent(email)}`
					: "Your Gmail account is ready in CAALM.",
			});
			void loadStatus();
		} else if (gmailParam !== "connected") {
			toast({
				title: "Gmail connection failed",
				description: `Could not finish Gmail setup (${gmailParam.replace(/_/g, " ")}).`,
				variant: "destructive",
			});
		}

		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("gmail");
			url.searchParams.delete("email");
			window.history.replaceState({}, "", url.toString());
		}
	}, [searchParams, toast, loadStatus]);

	const handleConnect = () => {
		window.location.href = "/api/gmail/auth";
	};

	const handleDisconnect = async () => {
		if (!(await ensureStepUp())) return;
		try {
			const response = await fetch("/api/gmail/disconnect", { method: "POST" });
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to disconnect");
			}
			toast({
				title: "Disconnected",
				description: "Gmail was disconnected from CAALM.",
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

	if (loading) {
		return (
			<IntegrationCard
				title="Gmail"
				description="Read inbox, drafts, and send mail inside CAALM"
				iconSrc={GMAIL_ICON}
				status="connecting"
				info="Checking your Gmail connection…"
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
			title="Gmail"
			description="Read inbox, drafts, and send mail inside CAALM"
			iconSrc={GMAIL_ICON}
			status={connected ? "connected" : "disconnected"}
			meta={userEmail || null}
			info={
				connected
					? "Use the mail icon in the dashboard header to open your inbox without leaving CAALM."
					: "Connect your Google account, approve Gmail permissions, then open mail from the dashboard header."
			}
			connectLabel="Connect Gmail"
			onConnect={handleConnect}
			onDisconnect={handleDisconnect}
		/>
	);
}
