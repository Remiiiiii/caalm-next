"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import { format } from "date-fns";
import {
	AlertCircle,
	Calendar as CalendarIcon,
	Clock,
	Eye,
	FileSliders,
	FileText,
	Loader2,
	MapPin,
	MessageSquare,
	Paperclip,
	Pencil,
	RefreshCw,
	Tag,
	Trash2,
	Users,
} from "lucide-react";
import React from "react";
import {
	getEventTypeConfig,
	getEventTypeLabel,
} from "@/components/calendar/eventTypeConfig";
import type {
	EventAttachment,
	LocalCalendarEvent,
} from "@/components/calendar/outlookStyleCalendarTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
	type CalendarPermissionMap,
	SENSITIVITY_LABELS,
} from "@/constants/rbac";
import type { CalendarApprovalRequest } from "@/lib/actions/calendar-approval.actions";
import {
	getApprovalStatusText,
	getSensitivityBadgeClasses,
} from "@/lib/calendar/calendarStatusDisplay";
import {
	formatEventDetailDateLine,
	formatEventDetailTimeLine,
} from "@/lib/calendar/eventDisplayFormat";
import { cn, convertFileSize } from "@/lib/utils";

export interface EventReviewDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	event: LocalCalendarEvent | null;
	isHolidayEvent: boolean | undefined;
	canViewSensitiveDetails: boolean;
	canCreateEvent: boolean;
	eventPermissions: CalendarPermissionMap | null;
	loadingApprovalRequest: boolean;
	eventApprovalRequest: CalendarApprovalRequest | null;
	loadingNames: boolean;
	participantNames: string[];
	attachmentDetails: Record<string, EventAttachment>;
	onOpenAiPanel: (
		mode: "pre-reads" | "chat",
		event: LocalCalendarEvent | null,
	) => void;
	onEditEvent: () => void;
	onDeleteEvent: () => void;
}

export function EventReviewDialog({
	isOpen,
	onOpenChange,
	event: selectedEvent,
	isHolidayEvent,
	canViewSensitiveDetails: canViewSelectedEventSensitiveDetails,
	canCreateEvent,
	eventPermissions: selectedEventPermissions,
	loadingApprovalRequest,
	eventApprovalRequest,
	loadingNames,
	participantNames,
	attachmentDetails,
	onOpenAiPanel,
	onEditEvent,
	onDeleteEvent,
}: EventReviewDialogProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[650px] p-0 max-h-[90vh] flex flex-col overflow-hidden">
				<VisuallyHiddenPrimitive.Root>
					<DialogTitle>{selectedEvent?.title || "Event Details"}</DialogTitle>
				</VisuallyHiddenPrimitive.Root>
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				{/* Professional Header */}
				<div className="glass-dialog-wizard-header">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div>
								{selectedEvent?.type === "contract review" ? (
									<FileSliders className="w-5 h-5 text-[#0f5384]" />
								) : selectedEvent &&
									getEventTypeConfig(selectedEvent.type).icon ? (
									React.createElement(
										getEventTypeConfig(selectedEvent.type).icon,
										{
											className: "w-5 h-5 text-white",
										},
									)
								) : (
									<CalendarIcon className="w-5 h-5 text-white" />
								)}
							</div>
							<div>
								<div className="flex items-center mt-4 gap-2">
									<FileSliders className="w-6 h-6 text-[#0f5384]" />
									<h2 className="text-xl font-semibold sidebar-gradient-text">
										{selectedEvent?.title || "Event Details"}
									</h2>
								</div>
								<p className="text-sm text-slate-600 mt-1 ml-8">
									Event Details & Management
								</p>
							</div>
						</div>
					</div>
				</div>

				{selectedEvent && (
					<>
						<div className="flex-1 overflow-y-auto">
							<div className="p-6 space-y-6">
								{/* Event Details Section */}
								<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
									<div className="flex items-center gap-2 text-sm font-semibold mb-4 text-slate-700">
										<FileText className="w-4 h-4 text-blue-600" />
										Event Information
									</div>

									<div className="space-y-4">
										{!isHolidayEvent && (
											<>
												<div className="flex flex-wrap items-center gap-2">
													{selectedEvent.sensitivityLevel && (
														<Badge
															variant="outline"
															className={cn(
																"h-5! min-h-0 w-fit min-w-0 rounded-full! px-1.5! py-0! text-[10px]! font-medium leading-none",
																getSensitivityBadgeClasses(
																	selectedEvent.sensitivityLevel || "standard",
																),
															)}
														>
															{
																SENSITIVITY_LABELS[
																	selectedEvent.sensitivityLevel || "standard"
																]
															}
														</Badge>
													)}
													{selectedEvent.approvalStatus &&
														selectedEvent.approvalStatus !== "not_required" && (
															<Badge
																variant={
																	selectedEvent.approvalStatus === "approved"
																		? "secondary"
																		: "outline"
																}
																className="uppercase sidebar-gradient-text"
															>
																{getApprovalStatusText(
																	selectedEvent.approvalStatus,
																)}
															</Badge>
														)}
												</div>
												{!canViewSelectedEventSensitiveDetails &&
													selectedEvent.sensitivityLevel &&
													selectedEvent.sensitivityLevel !== "standard" && (
														<div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
															You can view scheduling details, but sensitive
															content is hidden until an approver grants access.
														</div>
													)}

												{/* Enhanced Reviewer Notes Section */}
												{(selectedEvent.approvalStatus ===
													"changes_requested" ||
													selectedEvent.approvalStatus === "rejected") && (
													<div className="mt-4">
														{loadingApprovalRequest ? (
															<div className="rounded-lg p-4 border bg-slate-50 border-slate-200">
																<div className="flex items-center gap-2">
																	<Loader2 className="w-4 h-4 animate-spin text-slate-500" />
																	<span className="text-sm text-slate-600">
																		Loading reviewer feedback...
																	</span>
																</div>
															</div>
														) : eventApprovalRequest?.reviewerNotes ? (
															<div
																className={cn(
																	"rounded-lg p-4 border shadow-sm",
																	selectedEvent.approvalStatus ===
																		"changes_requested"
																		? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300"
																		: "bg-gradient-to-br from-red-50 to-pink-50 border-red-300",
																)}
															>
																<div className="flex items-start gap-3 mb-3">
																	<div
																		className={cn(
																			"flex items-center justify-center w-10 h-10 rounded-lg",
																			selectedEvent.approvalStatus ===
																				"changes_requested"
																				? "bg-amber-100"
																				: "bg-red-100",
																		)}
																	>
																		{selectedEvent.approvalStatus ===
																		"changes_requested" ? (
																			<MessageSquare className="w-5 h-5 text-amber-700" />
																		) : (
																			<AlertCircle className="w-5 h-5 text-red-700" />
																		)}
																	</div>
																	<div className="flex-1">
																		<h4
																			className={cn(
																				"text-sm font-semibold mb-1",
																				selectedEvent.approvalStatus ===
																					"changes_requested"
																					? "text-amber-900"
																					: "text-red-900",
																			)}
																		>
																			{selectedEvent.approvalStatus ===
																			"changes_requested"
																				? "Reviewer Feedback - Changes Requested"
																				: "Reviewer Feedback - Request Denied"}
																		</h4>
																		{eventApprovalRequest.decidedAt && (
																			<p
																				className={cn(
																					"text-xs",
																					selectedEvent.approvalStatus ===
																						"changes_requested"
																						? "text-amber-600"
																						: "text-red-600",
																				)}
																			>
																				Reviewed on{" "}
																				{format(
																					new Date(
																						eventApprovalRequest.decidedAt,
																					),
																					"MMM d, yyyy h:mm a",
																				)}
																			</p>
																		)}
																	</div>
																</div>
																<div
																	className={cn(
																		"rounded-md p-3 bg-white border",
																		selectedEvent.approvalStatus ===
																			"changes_requested"
																			? "border-amber-200"
																			: "border-red-200",
																	)}
																>
																	<p
																		className={cn(
																			"text-sm whitespace-pre-wrap leading-relaxed",
																			selectedEvent.approvalStatus ===
																				"changes_requested"
																				? "text-amber-900"
																				: "text-red-900",
																		)}
																	>
																		{eventApprovalRequest.reviewerNotes}
																	</p>
																</div>
																{selectedEvent.approvalStatus ===
																	"changes_requested" && (
																	<div className="mt-3 pt-3 border-t border-amber-200">
																		<p className="text-xs text-amber-700">
																			<strong>Next steps:</strong> Please review
																			the feedback above and make the requested
																			changes. Once updated, your event will be
																			resubmitted for approval.
																		</p>
																	</div>
																)}
															</div>
														) : (
															<div className="rounded-lg p-4 border bg-slate-50 border-slate-200">
																<p className="text-sm text-slate-600">
																	{selectedEvent.approvalStatus ===
																	"changes_requested"
																		? "No specific feedback provided. Please review your event details and resubmit."
																		: "No denial reason provided."}
																</p>
															</div>
														)}
													</div>
												)}
											</>
										)}

										{/* Date & Time */}
										<div
											className={
												isHolidayEvent
													? "grid grid-cols-1 gap-4"
													: "grid grid-cols-[1fr_.8fr] gap-4"
											}
										>
											<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
												<div className="w-8 h-8 bg-[#E6FAF9] rounded-lg flex items-center justify-center mt-0.5">
													<Clock className="w-4 h-4 text-blue" />
												</div>
												<div className="flex-1">
													<div className="text-sm font-medium text-slate-700">
														Date
													</div>
													<div className="text-sm text-slate-600">
														{formatEventDetailDateLine(selectedEvent.startDate)}
													</div>
													{(() => {
														const timeLine = formatEventDetailTimeLine({
															startDate: selectedEvent.startDate,
															startTime: selectedEvent.startTime,
															endTime: selectedEvent.endTime,
														});
														return timeLine ? (
															<div className="text-xs text-slate-500 mt-0.5">
																{timeLine}
															</div>
														) : null;
													})()}
												</div>
											</div>
											{/* Event Type - Only show for non-holiday events */}
											{!isHolidayEvent && (
												<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
													<div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mt-0.5">
														<Tag className="w-4 h-4 text-purple-600" />
													</div>
													<div className="flex-1">
														<div className="text-sm font-medium text-slate-700">
															Event Type
														</div>
														<div className="text-sm text-slate-600 whitespace-nowrap">
															{getEventTypeLabel(
																selectedEvent.type as unknown as string,
															)}
														</div>
													</div>
												</div>
											)}
										</div>

										{/* Participants - Only show for non-holiday events */}
										{!isHolidayEvent && canViewSelectedEventSensitiveDetails ? (
											<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
												<div className="w-8 h-8 bg-[#e0e0f5] rounded-lg flex items-center justify-center mt-0.5">
													<Users className="w-4 h-4 text-[#5558F9]" />
												</div>
												<div className="flex-1">
													<div className="text-sm font-medium text-slate-700 mb-1">
														Participants
													</div>
													<div className="text-sm text-slate-600">
														{(() => {
															// Check if participants exist (handle both string and array formats)
															const hasParticipants =
																selectedEvent.participants &&
																(Array.isArray(selectedEvent.participants)
																	? selectedEvent.participants.length > 0
																	: typeof selectedEvent.participants ===
																			"string" &&
																		selectedEvent.participants.trim().length >
																			0);

															if (!hasParticipants) {
																return (
																	<span className="text-slate-400 italic">
																		No participants
																	</span>
																);
															}

															return loadingNames ? (
																<span className="text-slate-400 flex items-center gap-2">
																	<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
																	Loading participants...
																</span>
															) : participantNames.length > 0 ? (
																<div className="space-y-1">
																	{participantNames.map((name, index) => (
																		<div
																			key={index}
																			className="flex items-center gap-2"
																		>
																			<div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xs font-medium">
																				{name.charAt(0).toUpperCase()}
																			</div>
																			<span>{name}</span>
																		</div>
																	))}
																</div>
															) : Array.isArray(selectedEvent.participants) ? (
																<div className="space-y-1">
																	{selectedEvent.participants.map(
																		(participant, index) => (
																			<div
																				key={index}
																				className="flex items-center gap-2"
																			>
																				<div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xs font-medium">
																					{participant.charAt(0).toUpperCase()}
																				</div>
																				<span>{participant}</span>
																			</div>
																		),
																	)}
																</div>
															) : selectedEvent.participants ? (
																<div className="space-y-1">
																	{selectedEvent.participants
																		.split(", ")
																		.map((participant, index) => (
																			<div
																				key={index}
																				className="flex items-center gap-2"
																			>
																				<div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xs font-medium">
																					{participant.charAt(0).toUpperCase()}
																				</div>
																				<span>{participant}</span>
																			</div>
																		))}
																</div>
															) : (
																<span className="text-slate-400 italic">
																	No participants
																</span>
															);
														})()}
													</div>
												</div>
											</div>
										) : (
											!isHolidayEvent && (
												<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-500">
													<div className="w-8 h-8 bg-[#e0e0f5] rounded-lg flex items-center justify-center mt-0.5">
														<Users className="w-4 h-4 text-[#5558F9]" />
													</div>
													<div className="flex-1">
														Participant details are restricted for this event.
													</div>
												</div>
											)
										)}

										{/* Contract - Only show for non-holiday events */}
										{!isHolidayEvent &&
											canViewSelectedEventSensitiveDetails &&
											(() => {
												if (!selectedEvent) return null;
												const eventType = String(
													selectedEvent.type || "",
												).toLowerCase();
												const isContractType =
													eventType === "contract review" ||
													eventType === "contract";
												if (!isContractType || !selectedEvent.contractName)
													return null;
												return (
													<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
														<div className="w-8 h-8 bg-[#f0ecec] rounded-full flex items-center justify-center mt-0.5">
															<FileText className="w-4 h-4 text-[#838181]" />
														</div>
														<div className="flex-1">
															<div className="text-sm font-medium text-slate-700 mb-1">
																Contract
															</div>
															<div className="text-sm text-slate-600 break-words">
																{selectedEvent.contractName}
															</div>
														</div>
													</div>
												);
											})()}

										{/* Location - Always show for holidays, conditional for others */}
										{(isHolidayEvent ||
											(canViewSelectedEventSensitiveDetails &&
												selectedEvent.location)) && (
											<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
												<div className="w-8 h-8 bg-[#fae3d3] rounded-full flex items-center justify-center mt-0.5">
													<MapPin className="w-4 h-4 text-orange" />
												</div>
												<div className="flex-1">
													<div className="text-sm font-medium text-slate-700 mb-1">
														Location
													</div>
													<div className="text-sm text-slate-600 break-words">
														{isHolidayEvent
															? "United States"
															: selectedEvent.location}
													</div>
												</div>
											</div>
										)}

										{/* Description - Only show for non-holiday events */}
										{!isHolidayEvent &&
											canViewSelectedEventSensitiveDetails &&
											selectedEvent.description?.trim() && (
												<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
													<div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mt-0.5">
														<MessageSquare className="w-4 h-4 text-indigo-600" />
													</div>
													<div className="flex-1">
														<div className="text-sm font-medium text-slate-700 mb-1">
															Description
														</div>
														<div className="text-sm text-slate-600 break-words whitespace-pre-wrap">
															{selectedEvent.description
																.replace(/<[^>]*>/g, "")
																.trim()}
														</div>
													</div>
												</div>
											)}

										{/* Attachments - Only show for non-holiday events */}
										{!isHolidayEvent &&
											canViewSelectedEventSensitiveDetails &&
											(() => {
												const attachmentFileIds = (
													selectedEvent.attachments || []
												).map((att) =>
													typeof att === "string" ? att : att.$id,
												);

												if (attachmentFileIds.length === 0) return null;

												return (
													<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
														<div className="w-8 h-8 bg-[#e0dede] rounded-full flex items-center justify-center mt-0.5">
															<Paperclip className="w-4 h-4 text-[#808080]" />
														</div>
														<div className="flex-1">
															<div className="text-sm font-medium text-slate-700 mb-2">
																Attachments ({attachmentFileIds.length})
															</div>
															<div className="space-y-2">
																{attachmentFileIds.map((fileId: string) => {
																	const attachment = attachmentDetails[fileId];
																	if (!attachment) {
																		return (
																			<div
																				key={fileId}
																				className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
																			>
																				<div className="flex items-center gap-2 flex-1 min-w-0">
																					<RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
																					<div className="flex-1 min-w-0">
																						<p className="text-sm font-medium text-slate-700 truncate">
																							Loading...
																						</p>
																					</div>
																				</div>
																			</div>
																		);
																	}

																	// Only render if attachment has at least a name or $id
																	if (!attachment.name && !attachment.$id) {
																		return null;
																	}

																	return (
																		<div
																			key={attachment.$id}
																			className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
																		>
																			<div className="flex items-center gap-2 flex-1 min-w-0">
																				<FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
																				<div className="flex-1 min-w-0">
																					{attachment.url ? (
																						<a
																							href={attachment.url}
																							target="_blank"
																							rel="noopener noreferrer"
																							className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline truncate block"
																						>
																							{attachment.name ||
																								"Unknown file"}
																						</a>
																					) : (
																						<p className="text-sm font-medium text-slate-700 truncate">
																							{attachment.name ||
																								"Unknown file"}
																						</p>
																					)}
																					<p className="text-xs text-slate-500">
																						{convertFileSize({
																							sizeInBytes: attachment.size,
																						})}
																						{attachment.extension && (
																							<>
																								{" "}
																								•{" "}
																								{attachment.extension.toUpperCase()}
																							</>
																						)}
																					</p>
																				</div>
																			</div>
																			<Button
																				variant="ghost"
																				size="sm"
																				className="h-8 w-8 p-0"
																				onClick={() => {
																					window.open(attachment.url, "_blank");
																				}}
																			>
																				<Eye className="w-4 h-4 text-blue-600" />
																			</Button>
																		</div>
																	);
																})}
															</div>
														</div>
													</div>
												);
											})()}
									</div>
								</div>

								{/* AI Assistant Section */}
								<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
									<div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
										<MessageSquare className="w-4 h-4 text-blue-600" />
										AI Assistant
									</div>

									<div className="space-y-3">
										{/* Pre-reads button - Only show for non-holiday events */}
										{!isHolidayEvent && (
											<Button
												variant="outline"
												className="h-auto w-full justify-start bg-white px-4 py-3 border-slate-200 hover:border-blue-500 hover:bg-blue-50 focus-visible:ring-[#078FAB] focus-visible:ring-offset-0"
												disabled={!canViewSelectedEventSensitiveDetails}
												title={
													!canViewSelectedEventSensitiveDetails
														? "You do not have permission to view sensitive AI recommendations"
														: undefined
												}
												onClick={() =>
													onOpenAiPanel("pre-reads", selectedEvent)
												}
											>
												<span className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#078FAB]/10 text-[#078FAB]">
													<Paperclip className="h-5 w-5" />
												</span>
												<div className="min-w-0 flex-1 text-left">
													<div className="text-sm font-semibold text-slate-700">
														What pre-reads should I review?
													</div>
													<div className="mt-0.5 text-xs text-slate-500">
														Get AI recommendations for preparation materials
													</div>
												</div>
											</Button>
										)}

										<Button
											variant="outline"
											className="h-auto w-full justify-start bg-white px-4 py-3 border-slate-200 hover:border-blue-500 hover:bg-blue-50 focus-visible:ring-[#078FAB] focus-visible:ring-offset-0"
											disabled={
												!isHolidayEvent && !canViewSelectedEventSensitiveDetails
											}
											title={
												!isHolidayEvent && !canViewSelectedEventSensitiveDetails
													? "You do not have permission to view sensitive AI recommendations"
													: undefined
											}
											onClick={() => onOpenAiPanel("chat", selectedEvent)}
										>
											<span className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#078FAB]/10 text-[#078FAB]">
												<MessageSquare className="h-5 w-5" />
											</span>
											<div className="min-w-0 flex-1 text-left">
												<div className="text-sm font-semibold text-slate-700">
													Chat with CAALM Calendar Assistant
												</div>
												<div className="mt-0.5 text-xs text-slate-500">
													Get help with meeting preparation and insights
												</div>
											</div>
										</Button>
									</div>
								</div>
							</div>
						</div>

						{/* Static Footer */}
						<div className="sticky bottom-0 z-10 border-t border-white/40 bg-white/35 px-6 py-4 backdrop-blur-sm">
							<div className="flex items-center justify-between">
								<div className="text-sm text-slate-500">
									Event created{" "}
									{selectedEvent &&
										format(new Date(selectedEvent.startDate), "MMM d, yyyy")}
								</div>
								{/* Edit/Delete only when user can create events (and role allows update/cancel) */}
								{!isHolidayEvent &&
									canCreateEvent &&
									(selectedEventPermissions?.updateEvent ||
										selectedEventPermissions?.cancelEvent) && (
										<div className="flex items-center gap-3">
											{selectedEventPermissions?.updateEvent ? (
												<Button
													variant="outline"
													onClick={onEditEvent}
													className="primary-btn px-3 sm:px-4"
												>
													<Pencil className="w-4 h-4 " />
													Edit Event
												</Button>
											) : null}
											{selectedEventPermissions?.cancelEvent ? (
												<Button
													variant="outline"
													onClick={onDeleteEvent}
													className="primary-btn px-3 sm:px-4 text-red-600 hover:text-red-700 hover:bg-red-50"
												>
													<Trash2 className="w-4 h-4" />
													Delete
												</Button>
											) : null}
										</div>
									)}
							</div>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
