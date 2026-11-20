"use client";

import { Flag } from "lucide-react";
import { getContractLifecycleDisplay } from "@/lib/contracts/contractLifecycleDisplay";
import { cn } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";

interface ContractLifecycleStatusBadgeProps {
	file: UIFileDoc;
	clickable?: boolean;
	onClick?: () => void;
	/** Hide the under-pill subtext (e.g. card grids put it on the meta line). */
	hideSubtext?: boolean;
}

/** CAALM badge tones (style-guide Badges table). */
const STATUS_TONES: Record<string, { fill: string; border: string }> = {
	"pending-review": {
		fill: "bg-orange/10 text-orange",
		border: "border-orange/20",
	},
	"action-required": {
		fill: "bg-red/10 text-red",
		border: "border-red/20",
	},
	"pending-signature": {
		fill: "bg-blue/10 text-blue",
		border: "border-blue/20",
	},
	"pending-countersign": {
		fill: "bg-blue/10 text-blue",
		border: "border-blue/20",
	},
	active: {
		fill: "bg-green/10 text-green",
		border: "border-green/20",
	},
	inactive: {
		fill: "bg-slate-100 text-slate-600",
		border: "border-slate-200",
	},
	expired: {
		fill: "bg-red/10 text-red",
		border: "border-red/20",
	},
	negotiation: {
		fill: "bg-orange/10 text-orange",
		border: "border-orange/20",
	},
	draft: {
		fill: "bg-slate-100 text-slate-600",
		border: "border-slate-200",
	},
};

const FALLBACK = {
	fill: "bg-slate-100 text-slate-700",
	border: "border-slate-200",
};

const STUCK_FILL = "bg-red/10 text-red";
const STUCK_DIVIDER = "bg-red/20";

function toneForKey(key: string) {
	return STATUS_TONES[key] ?? FALLBACK;
}

/**
 * Status column badge: one pill, optionally split for a stuck/alert half.
 * Shape + colors follow CAALM badges (`rounded-full`, green/orange/red/blue).
 */
export function ContractLifecycleStatusBadge({
	file,
	clickable = false,
	onClick,
	hideSubtext = false,
}: ContractLifecycleStatusBadgeProps) {
	const display = getContractLifecycleDisplay(file);
	const tone = toneForKey(display.key);
	const showStuck = display.stuck;
	const showSubtext = !hideSubtext && !!display.subtext;
	const subtextId = showSubtext
		? `lifecycle-sub-${file.$id || file.contractId || "row"}`
		: undefined;

	const halfClass =
		"inline-flex h-full max-w-[120px] items-center truncate px-2.5 text-[11px] font-medium leading-none";

	const shellClass = cn(
		"inline-flex h-6 overflow-hidden rounded-full border",
		tone.border,
		// Single-status: fill the whole pill. Split: halves paint themselves.
		!showStuck && tone.fill,
		clickable &&
			"cursor-pointer transition-shadow duration-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
	);

	const body = showStuck ? (
		<>
			<span className={cn(halfClass, tone.fill)} title={display.label}>
				{display.label}
			</span>
			<span
				aria-hidden
				className={cn("w-px shrink-0 self-stretch", STUCK_DIVIDER)}
			/>
			<span
				className={cn(halfClass, "max-w-[80px] gap-1", STUCK_FILL)}
				title="Stuck >3 days"
				aria-label="Stuck for more than 3 days"
			>
				<Flag className="h-3 w-3 shrink-0" aria-hidden />
				<span className="truncate">&gt;3 days</span>
			</span>
		</>
	) : (
		<span className={halfClass} title={display.label}>
			{display.label}
		</span>
	);

	return (
		<div
			className={cn(
				"min-w-0",
				showSubtext ? "flex flex-col items-start" : "inline-flex",
			)}
			aria-describedby={subtextId}
		>
			<div role="status">
				{clickable ? (
					<button
						type="button"
						className={shellClass}
						aria-label={`Open approval workflow for ${file.contractName || file.name || "contract"}`}
						onClick={(e) => {
							e.stopPropagation();
							onClick?.();
						}}
					>
						{body}
					</button>
				) : (
					<div className={shellClass}>{body}</div>
				)}
			</div>
			{showSubtext ? (
				<div
					id={subtextId}
					className="mt-[3px] text-[10px] leading-tight text-slate-500"
				>
					{display.subtext}
				</div>
			) : null}
		</div>
	);
}
