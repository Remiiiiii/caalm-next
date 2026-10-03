"use client";

import { Mail } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import GmailSheet from "@/components/gmail/GmailSheet";
import OutlookMailSheet from "@/components/outlook/OutlookMailSheet";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type MailProvider = "gmail" | "outlook";

/**
 * Header envelope control.
 * One connected provider → opens that sheet on click.
 * More than one → hover/open menu to pick which inbox sheet to open.
 */
export default function MailProviderLauncher() {
	const [gmailConnected, setGmailConnected] = useState(false);
	const [outlookConnected, setOutlookConnected] = useState(false);
	const [gmailOpen, setGmailOpen] = useState(false);
	const [outlookOpen, setOutlookOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);

	const refreshProviders = useCallback(async () => {
		try {
			const [gmailRes, outlookRes] = await Promise.all([
				fetch("/api/gmail/status").then(async (res) => {
					const data = await res.json().catch(() => ({}));
					return res.ok && Boolean(data.connected);
				}),
				fetch("/api/microsoft/mail/status").then(async (res) => {
					const data = await res.json().catch(() => ({}));
					return res.ok && Boolean(data.connected);
				}),
			]);
			setGmailConnected(gmailRes);
			setOutlookConnected(outlookRes);
		} catch {
			// Keep previous state; opening a sheet still works with its own status check.
		}
	}, []);

	useEffect(() => {
		void refreshProviders();
	}, [refreshProviders]);

	const connectedCount =
		(gmailConnected ? 1 : 0) + (outlookConnected ? 1 : 0);
	const multiProvider = connectedCount > 1;

	const openProvider = (provider: MailProvider) => {
		setMenuOpen(false);
		if (provider === "gmail") setGmailOpen(true);
		else setOutlookOpen(true);
	};

	const handleSingleClick = () => {
		if (outlookConnected && !gmailConnected) {
			setOutlookOpen(true);
			return;
		}
		// Default: Gmail sheet (shows connect CTA when nothing is linked).
		setGmailOpen(true);
	};

	return (
		<>
			{multiProvider ? (
				<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0 cursor-pointer text-slate-700 hover:bg-white/40"
							aria-label="Open mail — choose provider"
							onMouseEnter={() => setMenuOpen(true)}
						>
							<Mail className="h-6 w-6" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						sideOffset={8}
						className={cn(
							"min-w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 pt-1 shadow-lg",
							// Kill default glass-card-cap pseudo on DropdownMenuContent
							"before:hidden before:content-none before:h-0",
						)}
						onMouseLeave={() => setMenuOpen(false)}
					>
						{gmailConnected ? (
							<DropdownMenuItem
								onClick={() => openProvider("gmail")}
								className="cursor-pointer gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 focus:bg-slate-100 data-highlighted:bg-slate-100"
							>
								<Image
									src="/assets/icons/company-icons/gmail.svg"
									alt=""
									width={16}
									height={16}
								/>
								Gmail
							</DropdownMenuItem>
						) : null}
						{outlookConnected ? (
							<DropdownMenuItem
								onClick={() => openProvider("outlook")}
								className="cursor-pointer gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 focus:bg-slate-100 data-highlighted:bg-slate-100"
							>
								<Image
									src="/assets/icons/company-icons/microsoft.svg"
									alt=""
									width={16}
									height={16}
								/>
								Outlook Mail
							</DropdownMenuItem>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<Button
					variant="ghost"
					size="icon"
					onClick={handleSingleClick}
					className="h-8 w-8 shrink-0 cursor-pointer text-slate-700 hover:bg-white/40"
					aria-label="Open mail"
				>
					<Mail className="h-6 w-6" />
				</Button>
			)}

			<GmailSheet open={gmailOpen} onOpenChange={setGmailOpen} />
			<OutlookMailSheet open={outlookOpen} onOpenChange={setOutlookOpen} />
		</>
	);
}
