"use client";

import { HelpCircle } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import AssistantActionCompletedCard from "@/components/assistant/AssistantActionCompletedCard";
import AssistantActionLifecycleCard from "@/components/assistant/AssistantActionLifecycleCard";
import AssistantActivityFeedCard from "@/components/assistant/AssistantActivityFeedCard";
import AssistantAvatar from "@/components/assistant/AssistantAvatar";
import AssistantImplementationApplyCard from "@/components/assistant/AssistantImplementationApplyCard";
import AssistantInputFormCard from "@/components/assistant/AssistantInputFormCard";
import AssistantMeetingCreatedCard from "@/components/assistant/AssistantMeetingCreatedCard";
import AssistantMessageActions from "@/components/assistant/AssistantMessageActions";
import AssistantRichMarkdown from "@/components/assistant/AssistantRichMarkdown";
import AssistantSourceChips from "@/components/assistant/AssistantSourceChips";
import AssistantSuggestions from "@/components/assistant/AssistantSuggestions";
import AssistantResearchTracePlayback from "@/components/assistant/AssistantResearchTracePlayback";
import AssistantThinkingIndicator from "@/components/assistant/AssistantThinkingIndicator";
import type {
	AssistantSuggestion,
	UseCaalmAssistantReturn,
} from "@/components/assistant/assistantTypes";
import { LoadingSpinner } from "@/components/ui/loading";
import { SHEET_CHIP_IDLE } from "@/components/ui/sheet-chip";
import {
	changesFromPendingArgs,
	type ImplementationChange,
} from "@/lib/assistant/implementation-analysis";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
	"What are audits in CAALM?",
	"How do contract approvals work?",
	"Show my pending tasks",
	"What contracts or licenses are expiring soon?",
];

export default function AssistantChatThread({
	assistant,
	firstName,
	endRef,
	feedbackPromptId,
	onSuggestion,
	onQuickPrompt,
	onOpenHref,
	onThumbsDown,
	onLeaveFeedback,
	onThumbsUp,
	inlineFeedback,
	implementationChanges,
	suggestionsVariant = "pills",
}: {
	assistant: UseCaalmAssistantReturn;
	firstName: string;
	endRef: RefObject<HTMLDivElement | null>;
	feedbackPromptId: string | null;
	onSuggestion: (suggestion: AssistantSuggestion) => void;
	onQuickPrompt: (text: string) => void;
	onOpenHref: (href: string) => void;
	onThumbsDown: (id: string) => void;
	onLeaveFeedback: (id: string) => void;
	onThumbsUp: (id: string) => void;
	inlineFeedback?: ReactNode;
	implementationChanges?: ImplementationChange[];
	suggestionsVariant?: "pills" | "list";
}) {
	const lastAssistantId = [...assistant.messages]
		.reverse()
		.find((message) => message.role === "assistant")?.id;

	if (assistant.conversationLoading) {
		return (
			<LoadingSpinner
				size="sm"
				label="Loading conversation…"
				className="py-16"
			/>
		);
	}

	return (
		<div className="space-y-4">
			{assistant.messages.length === 0 && !assistant.isSending ? (
				<div className="space-y-6 py-6">
					<div className="text-center">
						<div className="mb-4 flex justify-center">
							<AssistantAvatar size="hero" alt="CAALM" priority />
						</div>
						<p className="text-xl font-bold sidebar-gradient-text">
							Hello {firstName}
						</p>
						<p className="mt-1 text-base text-slate-600">
							How can I assist you today?
						</p>
					</div>
					<div className="space-y-3">
						<p className="flex items-center justify-center gap-2 text-sm text-slate-600">
							<HelpCircle className="h-4 w-4 text-[#0f5384]" />
							Try a quick prompt:
						</p>
						<div className="flex flex-wrap justify-center gap-2">
							{QUICK_PROMPTS.map((prompt) => (
								<button
									key={prompt}
									type="button"
									onClick={() => onQuickPrompt(prompt)}
									className={SHEET_CHIP_IDLE}
								>
									{prompt}
								</button>
							))}
						</div>
					</div>
				</div>
			) : null}

			{assistant.messages.map((message) => {
				const applyPending =
					message.pendingAction?.toolName === "apply_audit_remediation" &&
					message.actionLifecycle?.state !== "completed" &&
					message.actionLifecycle?.state !== "failed";
				const showApply =
					Boolean(applyPending) &&
					assistant.pendingAction?.id === message.pendingAction?.id &&
					message.id === lastAssistantId;
				const hasLifecycleCard =
					Boolean(message.actionLifecycle) &&
					message.pendingAction?.toolName !== "create_calendar_event" &&
					!showApply;
				const hasInputForm = Boolean(message.inputForm);
				const applyChanges =
					implementationChanges && implementationChanges.length > 0
						? implementationChanges
						: changesFromPendingArgs(
								assistant.pendingAction?.args ?? message.pendingAction?.args,
							);
				const isLastAssistant = message.id === lastAssistantId;

				const researchSteps = message.researchSteps;
				const showResearchPlayback =
					Boolean(researchSteps?.length) &&
					message.id === assistant.researchPlaybackMessageId;

				return (
					<div
						key={message.id}
						className={cn(
							"flex w-full gap-2",
							message.role === "user" ? "justify-end" : "justify-start",
						)}
					>
						{message.role === "assistant" ? (
							<AssistantAvatar size="md" />
						) : null}
						<div
							className={cn(
								"min-w-0 text-sm",
								message.role === "user" ? "max-w-[85%]" : "max-w-[85%] flex-1",
							)}
						>
							<div
								className={cn(
									message.role === "user"
										? "chat-question-bubble"
										: hasLifecycleCard || hasInputForm || showApply
											? "overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 text-slate-700"
											: "rounded-2xl border border-slate-200/80 bg-white/60 px-3 py-2 text-slate-700",
								)}
								style={
									message.role === "user"
										? {
												padding: "10px 14px",
												borderRadius: "16px 4px 16px 16px",
												lineHeight: "20px",
												background: "#0f5384",
											}
										: undefined
								}
							>
							{message.content.trim() ? (
								<div
									className={cn(
										(hasLifecycleCard || hasInputForm || showApply) &&
											"px-3 pt-2",
									)}
								>
									<AssistantRichMarkdown
										text={message.content}
										tone={message.role}
										onOpenHref={onOpenHref}
									/>
								</div>
							) : null}
							{hasLifecycleCard && message.actionLifecycle ? (
								<AssistantActionLifecycleCard
									embedded
									action={message.actionLifecycle}
									pendingArgs={
										assistant.pendingAction?.id ===
										message.actionLifecycle.pendingActionId
											? assistant.pendingAction?.args
											: message.pendingAction?.args
									}
									disabled={assistant.isSending}
									onConfirm={() => void assistant.confirmAction()}
									onCancel={() => assistant.cancelPendingAction()}
									onRetry={() => void assistant.confirmAction()}
									onArgsChange={(argsPatch) =>
										assistant.patchPendingArgs(argsPatch)
									}
									onOpenEntity={() => {
										if (message.actionLifecycle?.entityHref) {
											onOpenHref(message.actionLifecycle.entityHref);
										}
									}}
								/>
							) : null}
							{showApply && applyChanges.length > 0 ? (
								<div className="px-3 pb-3">
									<AssistantImplementationApplyCard
										changes={applyChanges}
										busy={assistant.isSending}
										applyProgressSteps={assistant.applyProgressSteps}
										onApply={() => void assistant.confirmAction()}
										onCancel={() => assistant.cancelPendingAction()}
									/>
								</div>
							) : null}
							{message.meetingCreated ? (
								<AssistantMeetingCreatedCard
									meeting={message.meetingCreated}
									onOpenCalendar={() =>
										onOpenHref(
											message.meetingCreated?.calendarHref || "/calendar",
										)
									}
								/>
							) : null}
							{!message.actionLifecycle && message.actionCompleted ? (
								<AssistantActionCompletedCard
									action={message.actionCompleted}
								/>
							) : null}
							{message.activityFeed ? (
								<AssistantActivityFeedCard feed={message.activityFeed} />
							) : null}
							{message.inputForm &&
							isLastAssistant &&
							!assistant.isSending &&
							assistant.conversationStatus !== "closed" ? (
								<div className="px-3 pb-3">
									<AssistantInputFormCard
										form={message.inputForm}
										disabled={assistant.isSending}
										onSubmit={(text) => void assistant.sendMessage(text)}
									/>
								</div>
							) : null}
							{!researchSteps?.length && message.sources?.length ? (
								<div
									className={cn(
										"px-3 pb-1",
										!hasLifecycleCard && !showApply && "px-0",
									)}
								>
									<AssistantSourceChips
										sources={message.sources}
										onOpen={onOpenHref}
									/>
								</div>
							) : null}
							{message.role === "assistant" &&
							isLastAssistant &&
							message.suggestions?.length &&
							!hasInputForm &&
							!assistant.isSending &&
							assistant.conversationStatus !== "closed" ? (
								<div
									className={cn(
										hasLifecycleCard || showApply ? "px-3 pb-2" : "",
									)}
								>
									<AssistantSuggestions
										suggestions={message.suggestions}
										disabled={assistant.isSending}
										onSelect={onSuggestion}
										variant={suggestionsVariant}
									/>
								</div>
							) : null}
							{message.role === "assistant" && !hasInputForm ? (
								<div
									className={cn((hasLifecycleCard || showApply) && "px-3 pb-2")}
								>
									<AssistantMessageActions
										messageId={message.id}
										content={message.content}
										showLeaveFeedback={feedbackPromptId === message.id}
										onThumbsDown={onThumbsDown}
										onLeaveFeedback={onLeaveFeedback}
										onThumbsUp={onThumbsUp}
									/>
									{isLastAssistant ? inlineFeedback : null}
								</div>
							) : null}
							</div>
							{message.role === "assistant" && researchSteps?.length ? (
								<div className="mt-1.5">
									<AssistantResearchTracePlayback
										steps={researchSteps}
										autoPlayback={showResearchPlayback}
										collapsibleWhenDone
										onPlaybackComplete={assistant.completeResearchPlayback}
									/>
								</div>
							) : null}
						</div>
					</div>
				);
			})}

			{assistant.isSending && assistant.pendingResearchSteps ? (
				<div className="flex w-full justify-start gap-2">
					<AssistantAvatar size="md" />
					<div className="max-w-[85%] flex-1">
						<AssistantResearchTracePlayback
							steps={assistant.pendingResearchSteps}
							autoPlayback={false}
						/>
					</div>
				</div>
			) : assistant.isSending ? (
				<AssistantThinkingIndicator />
			) : null}
			<div ref={endRef} />
		</div>
	);
}
