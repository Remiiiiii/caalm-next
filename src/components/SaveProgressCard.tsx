"use client";

import { Loader2, SaveCheck } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
	description = "Even though auto-save is on you can manually save your progress to continue filling out this form at a later time",
}) => {
	return (
		<Card
			className={cn(
				"rounded-lg border border-slate-200 bg-slate-50 shadow-sm",
				className,
			)}
		>
			<CardContent className={cn(compact ? "p-4" : "pt-6")}>
				<div className="flex items-center justify-between gap-4">
					<div className={cn("min-w-0", compact ? "max-w-md" : "flex-1")}>
						<p className="text-sm font-medium text-slate-700 mb-1">
							Save and resume later
						</p>
						<p
							className={cn(
								"text-xs text-slate-500",
								compact ? "max-w-sm" : "max-w-[70%]",
							)}
						>
							{description}
						</p>
					</div>
					<Button
						type="button"
						onClick={onSave}
						disabled={isSaving}
						className={cn(
							"primary-btn shrink-0 px-3 shimmer-hover sm:px-4",
							compact ? "ml-0" : "ml-4",
						)}
					>
						{isSaving ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Saving...
							</>
						) : (
							<>
								<SaveCheck className="h-4 w-4" />
								Save Progress
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};

export default SaveProgressCard;
