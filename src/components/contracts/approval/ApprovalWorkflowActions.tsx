"use client";

import {
	ChevronDown,
	ChevronUp,
	Info,
	Loader2,
	UserPlus,
	UserRoundArrowLeft,
	UserRoundCheck,
	UserRoundX,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAvatarColor } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isAssigneeMatch } from "@/lib/approvals/assigneeIdentity";
import type { ApprovalWorkflowViewerPayload } from "@/lib/approvals/contractApprovalWorkflow.types";
import { cn } from "@/lib/utils";

interface ApprovalWorkflowActionsProps {
	workflow: ApprovalWorkflowViewerPayload;
	busy: boolean;
	onReassign: (assigneeUserIds: string[], reason: string) => Promise<void>;
	onResubmit: () => Promise<void>;
	onClaim?: () => Promise<void>;
}

const VISIBLE_LIMIT = 4;
/** Sentinel selection: assign every eligible candidate for this step. */
const ALL_ELIGIBLE = "__all_eligible__";

const ROLE_PILL =
	"inline-block shrink-0 px-2 py-0.5 text-xs rounded-full font-medium border bg-blue/10 text-blue border-blue/20";

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function CandidateAvatar({
	userId,
	fullName,
	profileImageUrl,
}: {
	userId: string;
	fullName: string;
	profileImageUrl?: string | null;
}) {
	const [imageFailed, setImageFailed] = useState(false);
	const showImage = Boolean(profileImageUrl) && !imageFailed;

	return (
		<span
			className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
			style={
				showImage ? undefined : { backgroundColor: getAvatarColor(userId) }
			}
			aria-hidden
		>
			{showImage ? (
				// eslint-disable-next-line @next/next/no-img-element -- remote Appwrite storage URL
				<img
					src={profileImageUrl || ""}
					alt=""
					className="h-full w-full object-cover"
					onError={() => setImageFailed(true)}
				/>
			) : (
				initials(fullName)
			)}
		</span>
	);
}

/** True when the step still needs a first assignment (not a routine override). */
function needsFirstAssignment(
	workflow: ApprovalWorkflowViewerPayload,
): boolean {
	if (workflow.needsExecutiveAssignment) return true;
	const current = workflow.steps[workflow.currentStepIndex];
	if (!current || current.status !== "current") return false;
	if (current.kind === "awaiting_executive") return true;
	return (current.assigneeUserIds || []).length === 0;
}

/** Banners + admin assign / uploader resubmit controls shared by contract & license dialogs. */
export default function ApprovalWorkflowActions({
	workflow,
	busy,
	onReassign,
	onResubmit,
	onClaim,
}: ApprovalWorkflowActionsProps) {
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [showAll, setShowAll] = useState(false);
	const [localBusy, setLocalBusy] = useState(false);
	const [confirmBulk, setConfirmBulk] = useState(false);
	const [reassignReason, setReassignReason] = useState("");
	const [reasonError, setReasonError] = useState<string | null>(null);
	const pending = busy || localBusy;

	const current = workflow.steps[workflow.currentStepIndex];
	const isExecutiveStep =
		workflow.needsExecutiveAssignment ||
		current?.kind === "executive_approval" ||
		current?.kind === "awaiting_executive";
	const firstAssignmentNeeded = needsFirstAssignment(workflow);

	const showReassign =
		(workflow.canAssignExecutive || workflow.canOverride) &&
		(workflow.needsExecutiveAssignment || current?.status === "current");

	const [adminPanelOpen, setAdminPanelOpen] = useState(firstAssignmentNeeded);

	useEffect(() => {
		// Expand on load/refresh only when assignment is still required.
		setAdminPanelOpen(firstAssignmentNeeded);
	}, [
		workflow.contractId,
		workflow.currentStepIndex,
		firstAssignmentNeeded,
		workflow.needsExecutiveAssignment,
	]);

	const candidates = workflow.reassignCandidates || [];
	const currentAssigneeIds = current?.assigneeUserIds || [];
	const viewerAlreadyAssigned = isAssigneeMatch(currentAssigneeIds, [
		workflow.viewerUserId,
	]);
	const viewerIsEligible = candidates.some(
		(person) => person.userId === workflow.viewerUserId,
	);

	// Reassign: only people not already on the step. First assign: full pool.
	const selectableCandidates = useMemo(() => {
		if (firstAssignmentNeeded) return candidates;
		return candidates.filter(
			(person) => !isAssigneeMatch(currentAssigneeIds, [person.userId]),
		);
	}, [candidates, currentAssigneeIds, firstAssignmentNeeded]);

	const currentlyAssignedPeople = useMemo(
		() =>
			candidates.filter((person) =>
				isAssigneeMatch(currentAssigneeIds, [person.userId]),
			),
		[candidates, currentAssigneeIds],
	);

	const noOtherEligible = selectableCandidates.length === 0;
	const showAssignMe =
		workflow.canOverride && !viewerAlreadyAssigned && viewerIsEligible;

	useEffect(() => {
		// Drop a stale selection if that person is no longer selectable.
		if (
			selectedUserId &&
			selectedUserId !== ALL_ELIGIBLE &&
			!selectableCandidates.some((person) => person.userId === selectedUserId)
		) {
			setSelectedUserId(null);
			setConfirmBulk(false);
		}
	}, [selectableCandidates, selectedUserId]);

	const visiblePeople = showAll
		? selectableCandidates
		: selectableCandidates.slice(0, VISIBLE_LIMIT);
	const hiddenCount = Math.max(0, selectableCandidates.length - VISIBLE_LIMIT);
	const roleGroupLabel = isExecutiveStep
		? "Executive"
		: "Department Manager";
	const panelTitle = firstAssignmentNeeded
		? isExecutiveStep
			? "Assign executive"
			: "Assign current step"
		: "Reassign current step";

	const run = async (fn: () => Promise<void>) => {
		setLocalBusy(true);
		try {
			await fn();
			setSelectedUserId(null);
			setShowAll(false);
			setReassignReason("");
			setReasonError(null);
		} finally {
			setLocalBusy(false);
		}
	};

	const submitReassign = (assigneeUserIds: string[]) => {
		const trimmed = reassignReason.trim();
		if (trimmed.length < 10) {
			setReasonError("Enter at least 10 characters explaining why.");
			return;
		}
		setReasonError(null);
		void run(() => onReassign(assigneeUserIds, trimmed));
	};

	return (
		<div className="space-y-3">
			{workflow.canClaimStep ? (
				<div className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50">
					<div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] items-center">
						<div className="min-w-0 px-5 py-4">
							<p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
								<UserRoundX className="h-4 w-4 text-[#0f5384]" />
								You're not assigned to this step
							</p>
							<p className="mt-1 ml-6 text-xs leading-relaxed text-slate-600">
								Claim it to become the reviewer. This is logged in the activity
								trail.
							</p>
						</div>
						<div className="relative flex min-w-0 flex-col justify-center self-stretch px-5 py-4">
							<span
								aria-hidden
								className="pointer-events-none absolute top-3 bottom-3 left-0 w-px bg-slate-200"
							/>
							<span
								aria-hidden
								className="pointer-events-none absolute top-3 bottom-3 right-0 w-px bg-slate-200"
							/>
							<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
								Audit note
							</p>
							<p className="mt-1 text-xs leading-relaxed text-slate-600">
								Claiming is logged with your name and timestamp in the activity
								trail.
							</p>
						</div>
						<div className="flex items-center px-5 py-4">
							{onClaim ? (
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4"
									disabled={pending}
									onClick={() => void run(onClaim)}
								>
									{pending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<UserRoundCheck className="h-4 w-4" />
									)}
									Claim this step
								</Button>
							) : null}
						</div>
					</div>
				</div>
			) : null}

			{workflow.needsExecutiveAssignment ? (
				<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
					<p className="font-medium">Needs executive assignment</p>
					<p className="mt-1 text-amber-900/80">
						No Executive role holder is assigned to the executive step. An admin
						must assign someone before the item can go active.
					</p>
				</div>
			) : null}

			{workflow.canResubmit ? (
				<div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-slate-700">
					<p className="font-medium">Changes were requested</p>
					<p className="mt-1 text-slate-600">
						After updating the item, resubmit to restart department review.
					</p>
					<Button
						type="button"
						className="primary-btn mt-3 px-3 sm:px-4"
						disabled={pending}
						onClick={() => void run(onResubmit)}
					>
						{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
						Resubmit for review
					</Button>
				</div>
			) : null}

			{showReassign ? (
				<div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<button
						type="button"
						className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-md text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						aria-expanded={adminPanelOpen}
						onClick={() => setAdminPanelOpen((open) => !open)}
					>
						<span className="min-w-0">
							<span className="block text-sm font-medium text-slate-700">
								{panelTitle}
							</span>
							<span className="mt-1 block text-xs text-slate-500">
								{firstAssignmentNeeded
									? "Pick who should own this step before the workflow can continue."
									: noOtherEligible
										? "No other eligible people to reassign to. Expand for options."
										: "Assignees are already set. Expand only if you need to change who owns this step."}
							</span>
						</span>
						{adminPanelOpen ? (
							<ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
						) : (
							<ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
						)}
					</button>

					{adminPanelOpen ? (
						<div className="mt-3">
							{currentlyAssignedPeople.length > 0 && !firstAssignmentNeeded ? (
								<div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
									<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
										Currently assigned
									</p>
									<ul className="mt-1.5 space-y-1">
										{currentlyAssignedPeople.map((person) => (
											<li
												key={person.userId}
												className="text-xs font-medium text-slate-700"
											>
												{person.fullName}
												{person.userId === workflow.viewerUserId ? " (you)" : ""}
											</li>
										))}
									</ul>
								</div>
							) : null}

							{noOtherEligible ? (
								<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
									<p className="flex items-start gap-2 font-medium">
										<Info
											className="mt-0.5 h-4 w-4 shrink-0 text-amber-800"
											aria-hidden
										/>
										<span>
											{candidates.length === 0
												? isExecutiveStep
													? "No Executive role holders found in this organization."
													: "No department managers found in this organization."
												: isExecutiveStep
													? "You're the only Executive available for this step."
													: "No other eligible people to reassign this step to."}
										</span>
									</p>
									<p className="mt-2 ml-6 text-xs leading-relaxed text-amber-900/90">
										{isExecutiveStep
											? "Keep Executive approval on an Executive role holder. Grant the Executive role to another person in User Management, or use Admin override below to decide this step yourself."
											: "Grant the right role in User Management, or use Admin override below to decide this step yourself."}
									</p>
									<div className="mt-3 ml-6 flex flex-wrap gap-2">
										<Button
											type="button"
											variant="outline"
											className="primary-btn px-3 sm:px-4"
											asChild
										>
											<Link href="/dashboard/user-management">
												<Users className="h-4 w-4" />
												Manage roles
											</Link>
										</Button>
									</div>
								</div>
							) : (
								<>
									<p className="mb-3 text-xs text-slate-500">
										Pick who should own{" "}
										<span className="font-medium text-slate-700">
											{current?.label || "this step"}
										</span>{" "}
										for {workflow.contractName}.
									</p>

									<div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
										<ul className="divide-y divide-slate-100">
											{visiblePeople.map((person) => {
												const isSelected = person.userId === selectedUserId;
												const isYou = person.userId === workflow.viewerUserId;
												return (
													<li key={person.userId}>
														<button
															type="button"
															aria-pressed={isSelected}
															disabled={pending}
															onClick={() => setSelectedUserId(person.userId)}
															className={cn(
																"flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5384]/40",
																isSelected && "bg-blue-50/80 hover:bg-blue-50",
															)}
														>
															<span
																className={cn(
																	"flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
																	isSelected
																		? "border-[#0f5384]"
																		: "border-slate-300",
																)}
																aria-hidden
															>
																{isSelected ? (
																	<span className="h-2 w-2 rounded-full bg-[#0f5384]" />
																) : null}
															</span>
															<CandidateAvatar
																userId={person.userId}
																fullName={person.fullName}
																profileImageUrl={person.profileImageUrl}
															/>
															<span className="min-w-0 flex-1">
																<span className="block truncate text-sm font-semibold text-slate-700">
																	{person.fullName}
																	{isYou ? (
																		<span className="font-normal text-slate-500">
																			{" "}
																			(you)
																		</span>
																	) : null}
																</span>
																<span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500">
																	<span className="truncate">
																		{person.email || "No email on file"}
																	</span>
																	{(person.roleLabels?.length
																		? person.roleLabels
																		: [person.roleLabel]
																	).map((label) => (
																		<span key={label} className={ROLE_PILL}>
																			{label}
																		</span>
																	))}
																</span>
															</span>
														</button>
													</li>
												);
											})}

											{selectableCandidates.length > 1 ? (
												<li>
													<button
														type="button"
														aria-pressed={selectedUserId === ALL_ELIGIBLE}
														disabled={pending}
														onClick={() => setSelectedUserId(ALL_ELIGIBLE)}
														className={cn(
															"flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5384]/40",
															selectedUserId === ALL_ELIGIBLE &&
																"bg-blue-50/80 hover:bg-blue-50",
														)}
													>
														<span
															className={cn(
																"flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
																selectedUserId === ALL_ELIGIBLE
																	? "border-[#0f5384]"
																	: "border-slate-300",
															)}
															aria-hidden
														>
															{selectedUserId === ALL_ELIGIBLE ? (
																<span className="h-2 w-2 rounded-full bg-[#0f5384]" />
															) : null}
														</span>
														<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
															<Users className="h-4 w-4" />
														</span>
														<span className="min-w-0 flex-1">
															<span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-700">
																<span>Anyone with</span>
																<span className={ROLE_PILL}>
																	{roleGroupLabel}
																</span>
																<span>role</span>
															</span>
															<span className="mt-0.5 block text-xs text-slate-500">
																Assigns all {selectableCandidates.length}{" "}
																{selectableCandidates.length === 1
																	? "person"
																	: "people"}{" "}
																available for this step
															</span>
														</span>
													</button>
												</li>
											) : null}
										</ul>

										{hiddenCount > 0 ? (
											<button
												type="button"
												className="flex w-full cursor-pointer items-center justify-center gap-1 border-t border-slate-100 px-3 py-2.5 text-xs font-medium text-slate-500 transition-colors duration-200 hover:text-slate-700"
												onClick={() => setShowAll((v) => !v)}
											>
												{showAll ? (
													<>
														Show fewer people
														<ChevronUp className="h-3.5 w-3.5" />
													</>
												) : (
													<>
														Show {hiddenCount} more{" "}
														{hiddenCount === 1 ? "person" : "people"}
														<ChevronDown className="h-3.5 w-3.5" />
													</>
												)}
											</button>
										) : null}
									</div>

									<div className="mt-3 space-y-1.5">
										<Label
											htmlFor="reassign-reason"
											className="text-sm text-slate-700"
										>
											{firstAssignmentNeeded
												? "Reason for assignment"
												: "Reason for reassignment"}
										</Label>
										<Textarea
											id="reassign-reason"
											value={reassignReason}
											onChange={(e) => {
												setReassignReason(e.target.value);
												if (reasonError) setReasonError(null);
											}}
											placeholder={
												firstAssignmentNeeded
													? "Why are you assigning this person?"
													: "Why are you changing who owns this step?"
											}
											className="min-h-18 border-[0.25px] border-slate-300"
											disabled={pending}
										/>
										{reasonError ? (
											<p className="text-xs text-red" role="alert">
												{reasonError}
											</p>
										) : (
											<p className="text-xs text-slate-500">
												Logged in the activity trail and audit report (min 10
												characters).
											</p>
										)}
									</div>

									<div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
										{showAssignMe ? (
											<Button
												type="button"
												variant="outline"
												className="primary-btn px-3 sm:px-4"
												disabled={pending}
												onClick={() =>
													submitReassign([workflow.viewerUserId])
												}
											>
												<UserRoundArrowLeft className="h-4 w-4" />
												Assign me
											</Button>
										) : null}
										<Button
											type="button"
											className="primary-btn px-3 sm:px-4"
											disabled={pending || !selectedUserId}
											onClick={() => {
												if (!selectedUserId) return;
												if (
													selectedUserId === ALL_ELIGIBLE &&
													!confirmBulk
												) {
													setConfirmBulk(true);
													return;
												}
												const assigneeUserIds =
													selectedUserId === ALL_ELIGIBLE
														? selectableCandidates.map((c) => c.userId)
														: [selectedUserId];
												if (assigneeUserIds.length === 0) return;
												setConfirmBulk(false);
												submitReassign(assigneeUserIds);
											}}
										>
											{pending ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<UserPlus className="h-4 w-4" />
											)}
											{selectedUserId === ALL_ELIGIBLE
												? confirmBulk
													? `Confirm assign all ${selectableCandidates.length}`
													: "Assign to all eligible"
												: "Assign to selected"}
										</Button>
									</div>
									{confirmBulk && selectedUserId === ALL_ELIGIBLE ? (
										<p className="mt-2 text-xs text-orange">
											This assigns every available {roleGroupLabel} for this
											step. Click again to confirm.
										</p>
									) : null}
								</>
							)}
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
}
