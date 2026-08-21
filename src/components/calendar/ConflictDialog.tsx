"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	AlertCircle,
	AlertTriangle,
	Ban,
	Clock,
	Loader2,
} from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 shadow-xl sm:max-w-2xl">
				<VisuallyHiddenPrimitive.Root>
					<DialogTitle>Scheduling Conflicts Detected</DialogTitle>
				</VisuallyHiddenPrimitive.Root>

				{/* Professional Cap */}
				<div className="h-4 w-full bg-[#d6d7d8] opacity-70 rounded-t-md" />

				{/* Header with gradient background */}
				<div className="sticky top-0 z-10 border-b border-white/40 bg-gradient-to-r from-red-50/85 to-orange-50/85 py-4 backdrop-blur-sm">
					<div className="flex items-center gap-3 px-6">
						<div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
							<AlertTriangle className="w-5 h-5 text-red-600" />
						</div>

						<div>
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Scheduling Conflicts Detected
							</DialogTitle>
							<DialogDescription className="text-sm text-slate-600 mt-1">
								The following conflicts were detected. Please review and confirm
								if you want to proceed with creating this event.
							</DialogDescription>
						</div>
					</div>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-6 bg-white">
					{conflictData && (
						<div className="space-y-6">
							<div>
								<h3 className="text-sm font-semibold text-slate-700 mb-3">
									Conflicts:
								</h3>
								<div className="space-y-3">
									{conflictData.conflicts.map((conflict, index) => (
										<div
											key={`${conflict.type}-${conflict.conflictingEvent.title ?? "event"}-${index}`}
											className="bg-red-50 border border-red-200 rounded-lg p-4"
										>
											<div className="flex items-start gap-3">
												<AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
												<div className="flex-1">
													<div className="flex items-center gap-2 mb-1">
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
													<p className="text-sm text-slate-700 mb-2">
														{conflict.conflictReason}
													</p>
													<div className="text-xs text-slate-600 space-y-1">
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
									<h3 className="text-sm font-semibold text-slate-700 mb-3">
										Suggested Alternate Times:
									</h3>
									<div className="space-y-2">
										{conflictData.alternateSlots.slice(0, 5).map((slot, index) => (
											<div
												key={`${slot.startDate}-${slot.startTime}-${index}`}
												className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm"
											>
												<div className="flex items-center gap-2">
													<Clock className="w-4 h-4 text-blue-600" />
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

							<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
								<div className="flex items-start gap-2">
									<AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
									<div className="text-sm text-amber-800">
										<strong>Warning:</strong> Creating this event will result in
										scheduling conflicts. Participants may be double-booked or
										resources may be over-allocated.
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Professional Footer */}
				<div className="flex items-center justify-between border-t border-white/40 bg-white/35 px-6 py-4 backdrop-blur-sm">
					<div className="text-xs text-slate-500">
						Review conflicts before proceeding.
					</div>
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							onClick={onCancel}
							disabled={creatingEvent}
							className="primary-btn px-3 sm:px-4"
						>
							<Ban className="w-4 h-4" />
							Cancel
						</Button>
						<Button
							onClick={onConfirm}
							disabled={creatingEvent}
							className="primary-btn px-3 sm:px-4 bg-red-600 hover:bg-red-700 text-white"
						>
							{creatingEvent ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Creating...
								</>
							) : (
								<>
									<AlertTriangle className="w-4 h-4" />
									Create Anyway
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
