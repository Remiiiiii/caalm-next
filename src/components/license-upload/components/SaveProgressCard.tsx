/**
 * Save progress card component
 */

"use client";

import { FileCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SaveProgressCardProps {
	onSave: () => void;
	isSaving: boolean;
}

export default function SaveProgressCard({
	onSave,
	isSaving,
}: SaveProgressCardProps) {
	return (
		<Card className="border border-slate-200 shadow-sm rounded-lg bg-slate-50">
			<CardContent className="pt-6">
				<div className="flex items-center justify-between">
					<div className="flex-1">
						<p className="text-sm font-medium text-slate-700 mb-1">
							Save and resume later
						</p>
						<p className="text-xs text-slate-500">
							Even though auto-save is on you can manually save your progress to
							continue filling out this form at a later time
						</p>
					</div>
					<Button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onSave();
						}}
						disabled={isSaving}
						className="ml-4 primary-btn sm:px-4 px-3 shimmer-hover"
					>
						{isSaving ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Saving...
							</>
						) : (
							<>
								<FileCheck className="h-4 w-4" />
								Save Progress
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
