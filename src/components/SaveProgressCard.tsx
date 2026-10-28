"use client";

import { Loader2, SaveCheck } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface SaveProgressCardProps {
	onSave: () => void;
	isSaving?: boolean;
	className?: string;
	compact?: boolean;
	description?: string;
}

/**
 * Reusable component for "Save and Resume Later" functionality
 * Displays a card with information about saving progress and a save button
 */
export const SaveProgressCard: React.FC<SaveProgressCardProps> = ({
	onSave,
	isSaving = false,
	className,
	compact = false,
	description = "Auto-save is on. You can also save manually and return to this form at any time.",
}) => {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-3 rounded-[10px] border border-slate-100 bg-slate-50/90 px-3.5 py-3",
				className,
			)}
		>
			<div className="min-w-0 flex-1">
				<p className="text-xs font-bold text-slate-700">
					Save and resume later
				</p>
				<p className="text-[11px] text-slate-400">{description}</p>
			</div>
			<Button
				type="button"
				onClick={onSave}
				disabled={isSaving}
				className="btn-primary shrink-0 gap-1.5"
			>
				{isSaving ? (
					<>
						<Loader2 className="h-[13px] w-[13px] animate-spin" />
						Saving...
					</>
				) : (
					<>
						<SaveCheck className="h-[13px] w-[13px]" />
						Save Progress
					</>
				)}
			</Button>
		</div>
	);
};

export default SaveProgressCard;
