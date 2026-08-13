"use client";

import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type IntegrationStatus =
	| "connected"
	| "disconnected"
	| "connecting"
	| "locked";

interface IntegrationCardProps {
	title: string;
	description: string;
	icon: LucideIcon;
	status: IntegrationStatus;
	lastSync?: string | null;
	meta?: string | null;
	lockedHint?: string;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onConfigure?: () => void;
	actions?: React.ReactNode;
	children?: React.ReactNode;
}

function statusBadge(status: IntegrationStatus) {
	switch (status) {
		case "connected":
			return {
				label: "Connected",
				className: "bg-green/10 text-green border-green/20",
			};
		case "connecting":
			return {
				label: "Connecting",
				className: "bg-orange/10 text-orange border-orange/20",
			};
		case "locked":
			return {
				label: "Upgrade required",
				className: "bg-slate-100 text-slate-600 border-slate-200",
			};
		default:
			return {
				label: "Not connected",
				className: "bg-slate-100 text-slate-600 border-slate-200",
			};
	}
}

export default function IntegrationCard({
	title,
	description,
	icon: Icon,
	status,
	lastSync,
	meta,
	lockedHint,
	onConnect,
	onDisconnect,
	onConfigure,
	actions,
	children,
}: IntegrationCardProps) {
	const badge = statusBadge(status);

	return (
		<Card className="glass-card h-full">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 flex flex-col h-full gap-4">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue/10">
							{status === "locked" ? (
								<Lock className="h-5 w-5 text-slate-500" />
							) : (
								<Icon className="h-5 w-5 text-[#0f5384]" />
							)}
						</div>
						<div>
							<p className="text-sm font-medium text-slate-700">{title}</p>
							<p className="text-xs text-slate-600 mt-1">{description}</p>
						</div>
					</div>
					<Badge variant="outline" className={cn("shrink-0", badge.className)}>
						{badge.label}
					</Badge>
				</div>

				{(meta || lastSync) && (
					<div className="text-xs text-slate-600 space-y-1">
						{meta && <p>{meta}</p>}
						{lastSync && <p>Last sync: {lastSync}</p>}
					</div>
				)}

				{status === "locked" && lockedHint && (
					<p className="text-xs text-slate-500">{lockedHint}</p>
				)}

				{children}

				<div className="mt-auto flex flex-wrap gap-2 pt-2">
					{actions}
					{!actions && status === "disconnected" && onConnect && (
						<Button
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							onClick={onConnect}
						>
							Connect
						</Button>
					)}
					{!actions && status === "connected" && (
						<>
							{onConfigure && (
								<Button
									variant="outline"
									className="primary-btn px-3 sm:px-4 cursor-pointer"
									onClick={onConfigure}
								>
									Configure
								</Button>
							)}
							{onDisconnect && (
								<Button
									variant="outline"
									className="px-3 sm:px-4 cursor-pointer"
									onClick={onDisconnect}
								>
									Disconnect
								</Button>
							)}
						</>
					)}
					{!actions && status === "locked" && onConnect && (
						<Button
							variant="outline"
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							onClick={onConnect}
						>
							View plans
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
