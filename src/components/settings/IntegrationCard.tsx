"use client";

import type { LucideIcon } from "lucide-react";
import { AlertCircle, Lock, Mail, Unplug } from "lucide-react";
import Image from "next/image";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { VscDebugConnectedCompact } from "react-icons/vsc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type IntegrationStatus =
	| "connected"
	| "disconnected"
	| "connecting"
	| "locked"
	| "coming_soon";

interface IntegrationCardProps {
	title: string;
	description: string;
	/** Lucide or inline SVG component (legacy) */
	icon?: LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;
	/** Brand mark from /public (e.g. company-icons/*.svg) */
	iconSrc?: string;
	status: IntegrationStatus;
	lastSync?: string | null;
	meta?: string | null;
	/** Blue info banner under title + description */
	info?: ReactNode;
	lockedHint?: string;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onConfigure?: () => void;
	/** Sales-led enterprise features (SSO, customer API) — not a fake OAuth connect. */
	onContactSales?: () => void;
	contactSalesLabel?: string;
	connectLabel?: string;
	/** Overflow menu (3-dot) rendered next to the status pill */
	menu?: ReactNode;
	actions?: ReactNode;
	children?: ReactNode;
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
		case "coming_soon":
			return {
				label: "Coming soon",
				className: "bg-orange/10 text-orange border-orange/20",
			};
		default:
			return {
				label: "Not connected",
				className: "bg-slate-100 text-slate-600 border-slate-200",
			};
	}
}

function InfoBanner({ children }: { children: ReactNode }) {
	return (
		<div className="flex items-start gap-2 rounded-lg border border-blue/20 bg-blue/10 p-3">
			<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
			<div className="min-w-0 text-xs text-slate-700">{children}</div>
		</div>
	);
}

export default function IntegrationCard({
	title,
	description,
	icon: Icon,
	iconSrc,
	status,
	lastSync,
	meta,
	info,
	lockedHint,
	onConnect,
	onDisconnect,
	onConfigure,
	onContactSales,
	contactSalesLabel = "Contact sales",
	connectLabel = "Connect",
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

	const bannerText =
		info ?? (status === "locked" && lockedHint ? lockedHint : null);

	const defaultActions = !actions ? (
		<>
			{status === "disconnected" && onConnect ? (
				<Button
					className="btn-primary w-full cursor-pointer px-3 sm:px-4"
					onClick={onConnect}
				>
					<VscDebugConnectedCompact className="h-4 w-4" aria-hidden />
					{connectLabel}
				</Button>
			) : null}
			{status === "connected" ? (
				<>
					{onConfigure ? (
						<Button
							className="btn-primary w-full cursor-pointer px-3 sm:px-4"
							onClick={onConfigure}
						>
							Configure
						</Button>
					) : null}
					{onDisconnect ? (
						<Button
							className="btn-primary w-full cursor-pointer px-3 sm:px-4"
							onClick={onDisconnect}
						>
							<Unplug className="h-4 w-4" aria-hidden />
							Disconnect
						</Button>
					) : null}
				</>
			) : null}
			{status === "locked" && onConnect ? (
				<Button
					className="btn-primary w-full cursor-pointer px-3 sm:px-4"
					onClick={onConnect}
				>
					View plans
				</Button>
			) : null}
			{status === "coming_soon" && onContactSales ? (
				<Button
					className="btn-primary w-full cursor-pointer px-3 sm:px-4"
					onClick={onContactSales}
				>
					<Mail className="h-4 w-4" aria-hidden />
					{contactSalesLabel}
				</Button>
			) : null}
		</>
	) : null;

	const hasFooterActions = Boolean(actions || defaultActions);

	return (
		<Card className="glass-card h-full">
			<div className="glass-card-cap" />
			<CardContent className="flex h-full flex-col gap-4 p-4 pb-6 sm:p-6 sm:pb-8">
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue/10">
							{iconSrc ? (
								<Image
									src={iconSrc}
									alt=""
									width={24}
									height={24}
									className="h-8 w-8 object-contain"
								/>
							) : Icon ? (
								<Icon className="h-5 w-5 text-[#0f5384]" />
							) : status === "locked" ? (
								<Lock className="h-5 w-5 text-slate-500" />
							) : null}
						</div>
						<div className="min-w-0">
							<p className="text-sm font-medium sidebar-gradient-text">
								{title}
							</p>
							<p className="mt-1 text-xs text-slate-600">{description}</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<span className={cn(PILL_BASE, badge.className)}>
							{badge.label}
						</span>
						{menu}
					</div>
				</div>

				{bannerText ? <InfoBanner>{bannerText}</InfoBanner> : null}

				{(connectedAs || lastSync) && (
					<div className="space-y-1 text-xs text-slate-600">
						{connectedAs ? <p>{connectedAs}</p> : null}
						{lastSync ? <p>Last sync {lastSync}</p> : null}
					</div>
				)}

				{children}

				{hasFooterActions ? (
					<div className="mt-auto flex w-full flex-col gap-2">
						{actions}
						{defaultActions}
					</div>
				) : (
					<div className="mt-auto" />
				)}
			</CardContent>
		</Card>
	);
}
