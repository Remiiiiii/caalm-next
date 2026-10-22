"use client";

import { AlertCircle, AlertTriangle, Clock, Loader2 } from "lucide-react";
import type React from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimeForDisplay } from "@/lib/calendar/eventDisplayFormat";

export type ConflictItem = {
	type: "participant" | "resource";
	conflictingEvent: {
		title?: string;
		startTime?: string;
		endTime?: string;
		location?: string;
	};
	conflictReason: string;
};

export type AlternateSlot = {
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
};

export type ConflictDialogData = {
	conflicts: ConflictItem[];
	alternateSlots: AlternateSlot[];
};

export interface ConflictDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	conflictData: ConflictDialogData | null;
	creatingEvent: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function ConflictDialog({
	open,
	onOpenChange,
	conflictData,
	creatingEvent,
	onCancel,
	onConfirm,
}: ConflictDialogProps): React.ReactElement {
	return (
		<AppDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onCancel();
				else onOpenChange(true);
			}}
			size="form"
			className="max-w-2xl"
			icon={<AlertTriangle className="h-5 w-5" />}
			title="Scheduling Conflicts Detected"
			description="The following conflicts were detected. Please review and confirm if you want to proceed with creating this event."
			pending={creatingEvent}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
						disabled={creatingEvent}
						onClick={onCancel}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="btn-primary"
						disabled={creatingEvent}
						onClick={onConfirm}
					>
						{creatingEvent ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<AlertTriangle className="h-4 w-4" />
						)}
						{creatingEvent ? "Creating..." : "Create Anyway"}
					</Button>
				</>
			}
		>
			{conflictData ? (
				<div className="space-y-6 pb-1">
					<div>
						<h3 className="mb-3 text-sm font-semibold text-slate-700">
							Conflicts:
						</h3>
						<div className="space-y-3">
							{conflictData.conflicts.map((conflict, index) => (
								<div
									key={`${conflict.type}-${conflict.conflictingEvent.title ?? "event"}-${index}`}
									className="rounded-lg border border-red-200 bg-red-50 p-4"
								>
									<div className="flex items-start gap-3">
										<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
										<div className="flex-1">
											<div className="mb-1 flex items-center gap-2">
												<Badge
													variant={
														conflict.type === "participant"
															? "destructive"
															: "secondary"
													}
												>
													{conflict.type === "participant"
														? "Participant Conflict"
														: "Resource Conflict"}
												</Badge>
											</div>
											<p className="mb-2 text-sm text-slate-700">
												{conflict.conflictReason}
											</p>
											<div className="space-y-1 text-xs text-slate-600">
												<div>
													<strong>Event:</strong>{" "}
													{conflict.conflictingEvent.title}
												</div>
												<div>
													<strong>Time:</strong>{" "}
													{formatTimeForDisplay(
														conflict.conflictingEvent.startTime || "",
													)}{" "}
													-{" "}
													{formatTimeForDisplay(
														conflict.conflictingEvent.endTime || "",
													)}
												</div>
												{conflict.conflictingEvent.location && (
													<div>
														<strong>Location:</strong>{" "}
														{conflict.conflictingEvent.location}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					{conflictData.alternateSlots.length > 0 && (
						<div>
							<h3 className="mb-3 text-sm font-semibold text-slate-700">
								Suggested Alternate Times:
							</h3>
							<div className="space-y-2">
								{conflictData.alternateSlots.slice(0, 5).map((slot, index) => (
									<div
										key={`${slot.startDate}-${slot.startTime}-${index}`}
										className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"
									>
										<div className="flex items-center gap-2">
											<Clock className="h-4 w-4 text-blue-600" />
											<span className="text-slate-700">
												{slot.startDate} at{" "}
												{formatTimeForDisplay(slot.startTime)} -{" "}
												{formatTimeForDisplay(slot.endTime)}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					<div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
						<div className="flex items-start gap-2">
							<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
							<div className="text-sm text-amber-800">
								<strong>Warning:</strong> Creating this event will result in
								scheduling conflicts. Participants may be double-booked or
								resources may be over-allocated.
							</div>
						</div>
					</div>
				</div>
			) : null}
		</AppDialog>
	);
}
