"use client";

import type { LucideIcon } from "lucide-react";
import { Lock, Unplug } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { VscDebugConnectedCompact } from "react-icons/vsc";
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
	icon: LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;
	status: IntegrationStatus;
	lastSync?: string | null;
	meta?: string | null;
	lockedHint?: string;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onConfigure?: () => void;
	/** Overflow menu (3-dot) rendered next to the status pill */
	menu?: React.ReactNode;
	actions?: React.ReactNode;
	children?: React.ReactNode;
}

const PILL_BASE =
	"inline-block px-2 py-0.5 text-xs rounded-full font-medium border";

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
	menu,
	actions,
	children,
}: IntegrationCardProps) {
	const badge = statusBadge(status);
	const connectedAs =
		status === "connected" && meta
			? meta.startsWith("Connected as ")
				? meta
				: `Connected as ${meta}`
			: meta;

	return (
		<Card className="glass-card h-full">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 flex flex-col h-full gap-4">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-3 min-w-0">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue/10">
							{status === "locked" ? (
								<Lock className="h-5 w-5 text-slate-500" />
							) : (
								<Icon className="h-5 w-5 text-[#0f5384]" />
							)}
						</div>
						<div className="min-w-0">
							<p className="text-sm font-medium sidebar-gradient-text">
								{title}
							</p>
							<p className="text-xs text-slate-600 mt-1">{description}</p>
						</div>
					</div>
					<div className="flex items-center gap-1 shrink-0">
						<span className={cn(PILL_BASE, badge.className)}>
							{badge.label}
						</span>
						{menu}
					</div>
				</div>

				{(connectedAs || lastSync) && (
					<div className="text-xs text-slate-600 space-y-1">
						{connectedAs && <p>{connectedAs}</p>}
						{lastSync && <p>Last sync {lastSync}</p>}
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
							className="btn-primary px-3 sm:px-4 cursor-pointer"
							onClick={onConnect}
						>
							<VscDebugConnectedCompact className="h-4 w-4" aria-hidden />
							Connect
						</Button>
					)}
					{!actions && status === "connected" && (
						<>
							{onConfigure && (
								<Button
									className="btn-primary px-3 sm:px-4 cursor-pointer"
									onClick={onConfigure}
								>
									Configure
								</Button>
							)}
							{onDisconnect && (
								<Button
									className="btn-primary px-3 sm:px-4 cursor-pointer"
									onClick={onDisconnect}
								>
									<Unplug className="h-4 w-4" aria-hidden />
									Disconnect
								</Button>
							)}
						</>
					)}
					{!actions && status === "locked" && onConnect && (
						<Button
							className="btn-primary px-3 sm:px-4 cursor-pointer"
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
