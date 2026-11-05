"use client";

import { Clock, Eye, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getExpiryActions } from "@/lib/expiry/action-matrix";

type ActionRailProps = {
	kind: "contract" | "license";
	daysRemaining: number;
	snoozeDays: number;
	/** Reset the confirm step when the slide changes. */
	resetKey: string;
	isBusy?: boolean;
	renewRequiresDesktop?: boolean;
	onRenew: () => void;
	onViewDetails: () => void;
	onSnooze?: () => void;
	onDismiss?: () => void;
	onLetExpire?: () => void;
	/** Fires when the user first clicks Let expire / Mark inactive (before confirm). */
	onDestructiveIntent?: () => void;
};

export default function ActionRail({
	kind,
	daysRemaining,
	snoozeDays,
	resetKey,
	isBusy,
	renewRequiresDesktop,
	onRenew,
	onViewDetails,
	onSnooze,
	onDismiss,
	onLetExpire,
	onDestructiveIntent,
}: ActionRailProps) {
	const actions = getExpiryActions({ kind, daysRemaining, snoozeDays });
	const [confirming, setConfirming] = useState(false);

	// Collapse any open confirm when the carousel moves to a new item.
	useEffect(() => {
		setConfirming(false);
	}, [resetKey]);

	const handleDeferral = () => {
		if (actions.deferral?.id === "snooze") onSnooze?.();
		else if (actions.deferral?.id === "dismiss") onDismiss?.();
	};

	return (
		<div className="flex w-full flex-col gap-2 md:w-[206px]">
			<p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
				Actions
			</p>

			<Button
				type="button"
				className="btn-primary w-full justify-center"
				onClick={onRenew}
				disabled={isBusy}
			>
				<RotateCcw className="h-4 w-4" />
				{actions.primary.label}
			</Button>
			{renewRequiresDesktop && (
				<p className="text-xs text-slate-500">Open on a laptop to renew.</p>
			)}

			<Button
				type="button"
				className="btn-primary w-full justify-center"
				onClick={onViewDetails}
				disabled={isBusy}
			>
				<Eye className="h-4 w-4" />
				{actions.secondary.label}
			</Button>

			<div className="my-1 border-t border-slate-200" />

			{actions.deferral && (
				<Button
					type="button"
					className="btn-primary w-full justify-center"
					onClick={handleDeferral}
					disabled={isBusy}
				>
					<Clock className="h-4 w-4" />
					{actions.deferral.label}
				</Button>
			)}

			{actions.destructive &&
				(confirming ? (
					<div className="flex flex-col gap-2 rounded-lg border border-red/20 bg-red/5 p-2">
						<p className="text-xs text-slate-600">
							{kind === "contract"
								? "Mark this contract inactive?"
								: "Dismiss this item?"}
						</p>
						<div className="flex gap-2">
							<Button
								type="button"
								className="delete-btn flex-1 justify-center"
								onClick={() => {
									onLetExpire?.();
									setConfirming(false);
								}}
								disabled={isBusy}
							>
								Confirm
							</Button>
							<Button
								type="button"
								className="btn-primary flex-1 justify-center"
								onClick={() => setConfirming(false)}
								disabled={isBusy}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<Button
						type="button"
						className="delete-btn w-full justify-center"
						onClick={() => {
							onDestructiveIntent?.();
							// Let the softer recoil land before the confirm strip appears.
							window.setTimeout(() => setConfirming(true), 520);
						}}
						disabled={isBusy}
					>
						<Trash2 className="h-4 w-4" />
						{actions.destructive.label}
					</Button>
				))}

			{/* Explains any absent / consequential action. */}
			<p className="mt-1 border-t border-dashed border-slate-200 pt-2 text-xs leading-relaxed text-slate-500">
				{actions.note}
			</p>
		</div>
	);
}
