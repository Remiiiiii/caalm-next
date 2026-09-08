"use client";

import {
	ChevronDown,
	ChevronUp,
	Loader2,
	UserPlus,
	UserRoundArrowLeft,
	Users,
} from "lucide-react";
import { useState } from "react";
import { getAvatarColor } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ApprovalWorkflowViewerPayload } from "@/lib/approvals/contractApprovalWorkflow.types";
import { cn } from "@/lib/utils";

interface ApprovalWorkflowActionsProps {
	workflow: ApprovalWorkflowViewerPayload;
	busy: boolean;
	onReassign: (assigneeUserIds: string[]) => Promise<void>;
	onResubmit: () => Promise<void>;
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

/** Banners + admin assign / uploader resubmit controls shared by contract & license dialogs. */
export default function ApprovalWorkflowActions({
	workflow,
	busy,
	onReassign,
	onResubmit,
}: ApprovalWorkflowActionsProps) {
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [showAll, setShowAll] = useState(false);
	const [localBusy, setLocalBusy] = useState(false);
	const pending = busy || localBusy;

	const current = workflow.steps[workflow.currentStepIndex];
	const isExecutiveStep =
		workflow.needsExecutiveAssignment ||
		current?.kind === "executive_approval" ||
		current?.kind === "awaiting_executive";

	const candidates = workflow.reassignCandidates || [];
	const visiblePeople = showAll
		? candidates
		: candidates.slice(0, VISIBLE_LIMIT);
	const hiddenCount = Math.max(0, candidates.length - VISIBLE_LIMIT);
	const roleGroupLabel = isExecutiveStep
		? "Super Admin or Organization Admin"
		: "Department Manager";

	const run = async (fn: () => Promise<void>) => {
		setLocalBusy(true);
		try {
			await fn();
			setSelectedUserId(null);
			setShowAll(false);
		} finally {
			setLocalBusy(false);
		}
	};

	const showReassign =
		(workflow.canAssignExecutive || workflow.canOverride) &&
		(workflow.needsExecutiveAssignment || current?.status === "current");

	return (
		<div className="space-y-3">
			{workflow.needsExecutiveAssignment ? (
				<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
					<p className="font-medium">Needs executive assignment</p>
					<p className="mt-1 text-amber-900/80">
						No Super Admin or Organization Admin is assigned to the executive
						step. An admin must assign someone before the item can go active.
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
				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="mb-1 text-sm font-medium text-slate-700">
						{workflow.needsExecutiveAssignment
							? "Assign executive"
							: "Reassign current step"}
					</p>
					<p className="mb-3 text-xs text-slate-500">
						Pick who should own{" "}
						<span className="font-medium text-slate-700">
							{current?.label || "this step"}
						</span>{" "}
						for {workflow.contractName}.
					</p>

					<div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
						{candidates.length === 0 ? (
							<p className="px-3 py-6 text-center text-sm text-slate-500">
								{isExecutiveStep
									? "No Super Admins or Organization Admins found in this organization."
									: "No department managers found in this organization."}
							</p>
						) : (
							<>
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
															<span aria-hidden>·</span>
															<span className={ROLE_PILL}>
																{person.roleLabel}
															</span>
														</span>
													</span>
												</button>
											</li>
										);
									})}

									<li>
										<button
											type="button"
											aria-pressed={selectedUserId === ALL_ELIGIBLE}
											disabled={pending || candidates.length === 0}
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
													<span className={ROLE_PILL}>{roleGroupLabel}</span>
													<span>role</span>
												</span>
												<span className="mt-0.5 block text-xs text-slate-500">
													Assigns all {candidates.length}{" "}
													{candidates.length === 1 ? "person" : "people"} in
													your organization
												</span>
											</span>
										</button>
									</li>
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
							</>
						)}
					</div>

					<div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
						{workflow.canOverride ? (
							<Button
								type="button"
								variant="outline"
								className="primary-btn px-3 sm:px-4"
								disabled={pending}
								onClick={() =>
									void run(() => onReassign([workflow.viewerUserId]))
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
								const assigneeUserIds =
									selectedUserId === ALL_ELIGIBLE
										? candidates.map((c) => c.userId)
										: [selectedUserId];
								if (assigneeUserIds.length === 0) return;
								void run(() => onReassign(assigneeUserIds));
							}}
						>
							{pending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<UserPlus className="h-4 w-4" />
							)}
							{selectedUserId === ALL_ELIGIBLE
								? "Assign to all eligible"
								: "Assign to selected"}
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
