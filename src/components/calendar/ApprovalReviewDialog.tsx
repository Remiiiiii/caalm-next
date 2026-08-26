"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import { format } from "date-fns";
import {
	Ban,
	Clock,
	Edit,
	FileCheck,
	FileText,
	Glasses,
	Loader2,
	MessageSquare,
	ThumbsUp,
} from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SENSITIVITY_LABELS } from "@/constants/rbac";
import type { CalendarApprovalRequest } from "@/lib/actions/calendar-approval.actions";
import { getSensitivityBadgeClasses } from "@/lib/calendar/calendarStatusDisplay";
import { cn } from "@/lib/utils";

export type ApprovalDecision = "approved" | "rejected" | "changes_requested";

export interface ApprovalReviewDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedApproval: CalendarApprovalRequest | null;
	reviewerNotes: string;
	onReviewerNotesChange: (value: string) => void;
	isProcessingApproval: boolean;
	userNamesMap: Record<string, string>;
	loadingUserNames: boolean;
	attachmentNamesMap: Record<string, string>;
	loadingAttachmentNames: boolean;
	onDecision: (decision: ApprovalDecision) => void | Promise<void>;
}

export function ApprovalReviewDialog({
	open,
	onOpenChange,
	selectedApproval,
	reviewerNotes,
	onReviewerNotesChange,
	isProcessingApproval,
	userNamesMap,
	loadingUserNames,
	attachmentNamesMap,
	loadingAttachmentNames,
	onDecision,
}: ApprovalReviewDialogProps): React.ReactElement {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[calc(100%-1.5rem)] sm:w-full max-w-[700px] p-0 max-h-[90vh] flex flex-col overflow-hidden">
				<VisuallyHiddenPrimitive.Root>
					<DialogTitle>
						{selectedApproval ? "Review Approval Request" : "Approval Details"}
					</DialogTitle>
				</VisuallyHiddenPrimitive.Root>
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

				{selectedApproval && (
					<>
						{/* Header */}
						<div className="glass-dialog-wizard-header px-6">
							<div className="flex items-center justify-between mt-6">
								<div className="flex items-center gap-3">
									<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
										{selectedApproval.changeType === "create" ? (
											<Glasses className="h-8 w-8 text-[#0f5384]" />
										) : selectedApproval.changeType === "update" ? (
											<Edit className="h-5 w-5 text-[#0f5384]" />
										) : (
											<Glasses className="h-8 w-8 text-[#0f5384]" />
										)}
									</div>
									<div>
										<h2 className="text-xl font-semibold sidebar-gradient-text">
											Review Approval Request
										</h2>
										<p className="text-sm text-slate-600 mt-0.5">
											{selectedApproval.changeType === "create"
												? "New Event Creation"
												: selectedApproval.changeType === "update"
													? "Event Update"
													: "Event Cancellation"}
										</p>
									</div>
								</div>
								<Badge
									variant="outline"
									className="text-xs font-medium px-3 py-1 uppercase tracking-wide border-amber-300 text-amber-700 bg-amber-50"
								>
									Pending Review
								</Badge>
							</div>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-y-auto">
							<div className="p-6 space-y-6">
								{/* Event Summary */}
								<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
									<div className="flex items-center gap-2 text-sm font-semibold mb-4 text-slate-700">
										<FileText className="w-4 h-4 text-blue-600" />
										Event Information
									</div>

									{(() => {
										const summary = selectedApproval.changeSummary || {};
										const after = (summary.after || {}) as Record<
											string,
											unknown
										>;
										const before = (summary.before || {}) as Record<
											string,
											unknown
										>;
										const eventTitle =
											(after.title as string) ||
											(before.title as string) ||
											"Untitled Event";
										const eventDate = after.startDate
											? new Date(after.startDate as string)
											: before.startDate
												? new Date(before.startDate as string)
												: null;
										const eventDescription =
											(after.description as string) ||
											(before.description as string) ||
											"No description provided";

										return (
											<div className="space-y-4">
												{/* Title and Sensitivity */}
												<div className="flex flex-wrap items-center gap-2">
													<h3 className="text-base font-semibold text-slate-700">
														{eventTitle}
													</h3>
													{selectedApproval.sensitivityLevel !== "standard" && (
														<Badge
															className={cn(
																"text-xs font-medium px-2 py-0.5 border",
																getSensitivityBadgeClasses(
																	selectedApproval.sensitivityLevel,
																),
															)}
														>
															{
																SENSITIVITY_LABELS[
																	selectedApproval.sensitivityLevel
																]
															}
														</Badge>
													)}
												</div>

												{/* Date & Time */}
												{eventDate && (
													<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
														<div className="w-8 h-8 bg-[#E6FAF9] rounded-lg flex items-center justify-center mt-0.5">
															<Clock className="w-4 h-4 text-blue-600" />
														</div>
														<div className="flex-1">
															<div className="text-sm font-medium text-slate-700">
																{format(eventDate, "EEEE, MMMM d, yyyy")}
															</div>
															{(() => {
																const startTimeStr =
																	after.startTime != null
																		? String(after.startTime)
																		: "";
																const endTimeStr =
																	after.endTime != null
																		? String(after.endTime)
																		: "";
																if (startTimeStr || endTimeStr) {
																	return (
																		<div className="text-sm text-slate-600 mt-1">
																			{startTimeStr}
																			{startTimeStr && endTimeStr ? " - " : ""}
																			{endTimeStr}
																		</div>
																	);
																}
																return null;
															})()}
														</div>
													</div>
												)}

												{/* Description */}
												{eventDescription &&
													eventDescription !== "No description provided" && (
														<div className="p-3 bg-white rounded-lg border border-slate-200">
															<p className="text-sm text-slate-700 whitespace-pre-wrap">
																{eventDescription}
															</p>
														</div>
													)}

												{/* Change Summary for Updates */}
												{selectedApproval.changeType === "update" &&
													(() => {
														// Helper function to format field values
														const formatFieldValue = (
															key: string,
															value: unknown,
														): string => {
															if (value === null || value === undefined) {
																return "—";
															}

															// Format dates
															if (
																key.toLowerCase().includes("date") &&
																typeof value === "string"
															) {
																try {
																	const date = new Date(value);
																	if (!Number.isNaN(date.getTime())) {
																		return format(date, "MMM d, yyyy");
																	}
																} catch {
																	// Fall through to string conversion
																}
															}

															// Format user IDs to names
															if (
																(key.includes("UserId") ||
																	key.includes("userId") ||
																	key.includes("AccountId") ||
																	key.includes("accountId") ||
																	key === "updatedBy" ||
																	key === "createdBy") &&
																typeof value === "string"
															) {
																return (
																	userNamesMap[value] ||
																	(loadingUserNames ? "Loading..." : value)
																);
															}

															// Format boolean values
															if (typeof value === "boolean") {
																return value ? "Yes" : "No";
															}

															// Format attachments with file names
															if (
																key === "attachments" &&
																Array.isArray(value)
															) {
																if (value.length === 0) {
																	return "None";
																}

																// Try to get file names from the attachment names map
																const fileNames = value
																	.map((att) => {
																		const fileId =
																			typeof att === "string" ? att : att?.$id;
																		if (!fileId) return null;
																		return attachmentNamesMap[fileId] || null;
																	})
																	.filter(
																		(name): name is string => name !== null,
																	);

																if (fileNames.length > 0) {
																	// Show count and file names
																	if (fileNames.length === value.length) {
																		// All files have names - show all names
																		const maxDisplayNames = 3;
																		if (fileNames.length <= maxDisplayNames) {
																			// Show all names if 3 or fewer
																			return `${value.length} file${
																				value.length !== 1 ? "s" : ""
																			}: ${fileNames.join(", ")}`;
																		} else {
																			// Show first few names and count of remaining
																			const displayedNames = fileNames
																				.slice(0, maxDisplayNames)
																				.join(", ");
																			const remainingCount =
																				fileNames.length - maxDisplayNames;
																			return `${value.length} file${
																				value.length !== 1 ? "s" : ""
																			}: ${displayedNames}, and ${remainingCount} more`;
																		}
																	} else {
																		// Some files have names, some don't
																		const namedCount = fileNames.length;
																		const unnamedCount =
																			value.length - namedCount;
																		const maxDisplayNames = 3;

																		if (namedCount <= maxDisplayNames) {
																			// Show all named files
																			const namesList = fileNames.join(", ");
																			const unnamedText =
																				unnamedCount > 0
																					? `, ${unnamedCount} unnamed`
																					: "";
																			return `${value.length} file${
																				value.length !== 1 ? "s" : ""
																			}: ${namesList}${unnamedText}`;
																		} else {
																			// Show first few names
																			const displayedNames = fileNames
																				.slice(0, maxDisplayNames)
																				.join(", ");
																			const remainingNamed =
																				namedCount - maxDisplayNames;
																			const totalRemaining =
																				remainingNamed + unnamedCount;
																			return `${value.length} file${
																				value.length !== 1 ? "s" : ""
																			}: ${displayedNames}, and ${totalRemaining} more`;
																		}
																	}
																}

																// Fallback to count if names not available yet
																return loadingAttachmentNames
																	? `Loading... (${value.length} file${
																			value.length !== 1 ? "s" : ""
																		})`
																	: `${value.length} file${
																			value.length !== 1 ? "s" : ""
																		}`;
															}

															// Format arrays (non-attachments)
															if (Array.isArray(value)) {
																return value.length > 0
																	? `${value.length} item${
																			value.length !== 1 ? "s" : ""
																		}`
																	: "None";
															}

															return String(value);
														};

														// Helper function to get field label
														const getFieldLabel = (key: string): string => {
															if (!key || typeof key !== "string") {
																return "Unknown Field";
															}

															const labelMap: Record<string, string> = {
																startDate: "Start Date",
																endDate: "End Date",
																title: "Title",
																description: "Description",
																startTime: "Start Time",
																endTime: "End Time",
																location: "Location",
																type: "Event Type",
																sensitivityLevel: "Sensitivity Level",
																updatedByAccountId: "Updated By",
																updatedByUserId: "Updated By",
																createdByAccountId: "Created By",
																createdByUserId: "Created By",
																attachments: "Attachments",
																overrides: "Permission Overrides",
																participants: "Participants",
															};

															if (labelMap[key]) {
																return labelMap[key];
															}

															// Safely format the key
															try {
																const formatted = key
																	.replace(/([A-Z])/g, " $1")
																	.replace(/^./, (str) =>
																		(str || "").toUpperCase(),
																	)
																	.trim();
																return formatted || key || "Unknown Field";
															} catch (error) {
																console.error(
																	"Error formatting field label:",
																	error,
																	{ key },
																);
																return key || "Unknown Field";
															}
														};

														// Filter and sort changes
														const rawChanges = Object.keys(after)
															.filter(
																(key) =>
																	key &&
																	typeof key === "string" &&
																	before[key] !== after[key] &&
																	![
																		"$id",
																		"updatedAt",
																		"createdAt",
																		"$createdAt",
																		"$updatedAt",
																		"$permissions",
																	].includes(key) &&
																	after[key] !== undefined,
															)
															.map((key) => {
																const label = getFieldLabel(key);
																return {
																	key: key || "unknown",
																	label: label || "Unknown Field",
																	beforeValue: before[key],
																	afterValue: after[key],
																};
															})
															.filter((change) => change.label && change.key);

														// Consolidate duplicate "Updated By" entries
														const changesMap = new Map<
															string,
															(typeof rawChanges)[0]
														>();

														// Check if Updated By fields actually changed
														const updatedByBefore =
															before.updatedByAccountId ||
															before.updatedByUserId;
														const updatedByAfter =
															after.updatedByAccountId || after.updatedByUserId;

														if (
															updatedByBefore !== updatedByAfter &&
															(updatedByBefore || updatedByAfter)
														) {
															changesMap.set("updatedBy", {
																key: "updatedBy",
																label: "Updated By",
																beforeValue: updatedByBefore,
																afterValue: updatedByAfter,
															});
														}

														// Check if Created By fields actually changed
														const createdByBefore =
															before.createdByAccountId ||
															before.createdByUserId;
														const createdByAfter =
															after.createdByAccountId || after.createdByUserId;

														if (
															createdByBefore !== createdByAfter &&
															(createdByBefore || createdByAfter)
														) {
															changesMap.set("createdBy", {
																key: "createdBy",
																label: "Created By",
																beforeValue: createdByBefore,
																afterValue: createdByAfter,
															});
														}

														// Add other changes (excluding the individual ID fields we consolidated)
														rawChanges.forEach((change) => {
															if (
																change.key !== "updatedByAccountId" &&
																change.key !== "updatedByUserId" &&
																change.key !== "createdByAccountId" &&
																change.key !== "createdByUserId"
															) {
																changesMap.set(change.key, change);
															}
														});

														const changes = Array.from(
															changesMap.values(),
														).sort((a, b) => {
															// Sort: dates first, then user fields, then others
															const aIsDate = a.key
																.toLowerCase()
																.includes("date");
															const bIsDate = b.key
																.toLowerCase()
																.includes("date");
															if (aIsDate && !bIsDate) return -1;
															if (!aIsDate && bIsDate) return 1;

															const aIsUser =
																a.key.includes("UserId") ||
																a.key.includes("AccountId") ||
																a.key === "updatedBy" ||
																a.key === "createdBy";
															const bIsUser =
																b.key.includes("UserId") ||
																b.key.includes("AccountId") ||
																b.key === "updatedBy" ||
																b.key === "createdBy";
															if (aIsUser && !bIsUser) return -1;
															if (!aIsUser && bIsUser) return 1;

															return a.label.localeCompare(b.label);
														});

														if (changes.length === 0) {
															return null;
														}

														return (
															<div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200/60 shadow-sm">
																<div className="px-4 py-3 border-b border-amber-200/60">
																	<div className="flex items-center gap-2.5">
																		<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100">
																			<FileCheck className="w-4 h-4 text-amber-700" />
																		</div>
																		<div>
																			<h4 className="text-sm font-semibold text-amber-900">
																				Changes Made
																			</h4>
																			<p className="text-xs text-amber-700/80 mt-0.5">
																				{changes.length}{" "}
																				{changes.length === 1
																					? "field modified"
																					: "fields modified"}
																			</p>
																		</div>
																	</div>
																</div>
																<div className="p-4 space-y-3">
																	{changes.map((change) => {
																		const formattedBefore = formatFieldValue(
																			change.key,
																			change.beforeValue,
																		);
																		const formattedAfter = formatFieldValue(
																			change.key,
																			change.afterValue,
																		);
																		const hasChange =
																			change.beforeValue !== null;

																		// Safety check: ensure change has valid label
																		if (!change?.label || !change.key) {
																			return null;
																		}

																		return (
																			<div
																				key={change.key}
																				className="flex items-start gap-4 pb-3 last:pb-0 border-b border-amber-100/60 last:border-0"
																			>
																				<div className="flex-1 min-w-0">
																					<div className="text-xs font-medium text-amber-800/90 mb-1.5 uppercase tracking-wide">
																						{change.label || "Unknown Field"}
																					</div>
																					<div className="space-y-1.5">
																						{hasChange ? (
																							<div className="flex items-center gap-2">
																								<div className="flex-1 px-2.5 py-1.5 bg-white/60 rounded border border-amber-200/40">
																									<span className="text-xs text-amber-700/80 line-through">
																										{formattedBefore}
																									</span>
																								</div>
																								<div className="flex-shrink-0">
																									<div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
																										<span className="text-[10px] text-blue-600 font-semibold">
																											→
																										</span>
																									</div>
																								</div>
																								<div className="flex-1 px-2.5 py-1.5 bg-white rounded border border-amber-300/60 shadow-sm">
																									<span className="text-xs font-semibold text-amber-900">
																										{formattedAfter}
																									</span>
																								</div>
																							</div>
																						) : (
																							<div className="px-2.5 py-1.5 bg-white rounded border border-amber-300/60 shadow-sm">
																								<span className="text-xs font-semibold text-amber-900">
																									{formattedAfter}
																								</span>
																							</div>
																						)}
																					</div>
																				</div>
																			</div>
																		);
																	})}
																</div>
															</div>
														);
													})()}
											</div>
										);
									})()}
								</div>

								{/* Request Details */}
								<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
									<div className="flex items-center gap-2 text-sm font-semibold mb-4 text-slate-700">
										<Clock className="w-4 h-4 text-blue-600" />
										Request Details
									</div>
									<div className="space-y-3 text-sm">
										<div className="flex items-center justify-between">
											<span className="text-slate-600">Submitted:</span>
											<span className="font-medium text-slate-700">
												{selectedApproval.submittedAt
													? format(
															new Date(selectedApproval.submittedAt),
															"MMM d, yyyy h:mm a",
														)
													: "Unknown"}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-slate-600">Request Type:</span>
											<Badge
												variant="outline"
												className="text-xs font-medium px-2 py-0.5 uppercase"
											>
												{selectedApproval.changeType}
											</Badge>
										</div>
									</div>
								</div>

								{/* Reviewer Notes */}
								<div className="space-y-2">
									<Label
										htmlFor="reviewer-notes"
										className="text-sm font-semibold text-slate-700"
									>
										Reviewer Notes (Optional)
									</Label>
									<Textarea
										id="reviewer-notes"
										placeholder="Add any notes or feedback for the requester..."
										value={reviewerNotes}
										onChange={(e) => onReviewerNotesChange(e.target.value)}
										className="min-h-[100px] resize-none bg-white border-slate-300 focus:border-[#078FAB] focus:ring-1 focus:ring-[#078FAB] focus-visible:ring-1 focus-visible:ring-[#078FAB] focus-visible:ring-offset-0"
										disabled={isProcessingApproval}
									/>
									<p className="text-xs text-slate-500">
										These notes will be visible to the event creator and
										included in the audit log.
									</p>
								</div>
							</div>
						</div>

						{/* Footer Actions */}
						<div className="sticky bottom-0 flex items-center gap-3 border-t border-white/40 bg-white/35 px-6 py-4 backdrop-blur-sm">
							<Button
								onClick={async () => {
									if (!selectedApproval) return;
									await onDecision("changes_requested");
								}}
								disabled={isProcessingApproval}
								className="primary-btn px-3 sm:px-4 flex-1"
							>
								{isProcessingApproval ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<MessageSquare className="w-4 h-4" />
								)}
								Request Changes
							</Button>
							<Button
								onClick={async () => {
									if (!selectedApproval) return;
									await onDecision("rejected");
								}}
								disabled={isProcessingApproval}
								className="primary-btn px-3 sm:px-4 flex-1"
							>
								{isProcessingApproval ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Ban className="w-4 h-4" />
								)}
								Deny
							</Button>

							<Button
								onClick={async () => {
									if (!selectedApproval) return;
									await onDecision("approved");
								}}
								disabled={isProcessingApproval}
								className="primary-btn px-3 sm:px-4 flex-1"
							>
								{isProcessingApproval ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<ThumbsUp className="w-4 h-4" />
								)}
								Approve
							</Button>
							<Button
								onClick={() => onOpenChange(false)}
								disabled={isProcessingApproval}
								className="primary-btn px-3 sm:px-4 flex-1"
							>
								<Ban className="w-4 h-4" />
								Cancel
							</Button>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
