import { type NextRequest, NextResponse } from "next/server";
import {
	buildCalendarActionCompleted,
	formatGenericSuccessSummary,
} from "@/lib/assistant/actionCompleted";
import {
	isAssistantAuthError,
	requireAssistantAccess,
} from "@/lib/assistant/auth";
import {
	appendMessage,
	truncatePreview,
	updateConversationMeta,
} from "@/lib/assistant/conversationStore";
import type { AssistantCalendarMutation } from "@/lib/assistant/executeTypes";
import { runToolByName } from "@/lib/assistant/tools/registry";
import {
	consumePendingAction,
	patchPendingActionArgs,
} from "@/lib/assistant/tools/types";

function buildCalendarMutation(
	toolName: string,
	resultObj: Record<string, unknown> | null,
): AssistantCalendarMutation | undefined {
	if (!resultObj || resultObj.error || resultObj.pendingApproval) {
		return undefined;
	}
	const eventId =
		typeof resultObj.eventId === "string" ? resultObj.eventId : undefined;
	const title =
		typeof resultObj.title === "string" ? resultObj.title : undefined;
	const date = typeof resultObj.date === "string" ? resultObj.date : undefined;
	const startTime =
		typeof resultObj.startTime === "string" ? resultObj.startTime : undefined;
	const endTime =
		typeof resultObj.endTime === "string" ? resultObj.endTime : undefined;

	if (toolName === "create_calendar_event") {
		return { kind: "create", eventId, title, date, startTime, endTime };
	}
	if (toolName === "reschedule_calendar_event") {
		return { kind: "update", eventId, title, date, startTime, endTime };
	}
	if (toolName === "cancel_calendar_event") {
		return { kind: "remove", eventId, title, date };
	}
	return undefined;
}

function formatMeetingSuccessSummary(result: Record<string, unknown>): string {
	const title = String(result.title ?? "Meeting");
	const date = String(result.date ?? "");
	const start = result.startTime ? String(result.startTime) : "";
	const end = result.endTime ? String(result.endTime) : "";
	const time = start && end ? `${start} – ${end}` : start || end || "time TBD";
	const invited = Number(result.invitedCount) || 0;
	const inviteLine =
		invited > 0
			? `${invited} ${invited === 1 ? "person" : "people"} invited.`
			: "No invitees added.";
	return `Meeting successfully created.\n\n**${title}**\n${date} · ${time}\n${inviteLine}`;
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAssistantAccess();
		if (isAssistantAuthError(auth)) return auth;

		const body = await request.json();
		const pendingId = body.pendingActionId as string | undefined;
		const conversationId = body.conversationId as string | undefined;
		const argsPatch =
			body.argsPatch && typeof body.argsPatch === "object"
				? (body.argsPatch as Record<string, unknown>)
				: null;

		if (!pendingId) {
			return NextResponse.json(
				{ error: "pendingActionId is required" },
				{ status: 400 },
			);
		}

		if (argsPatch) {
			const patched = await patchPendingActionArgs(pendingId, auth, argsPatch);
			if (!patched) {
				return NextResponse.json(
					{ error: "Action expired or not found" },
					{ status: 410 },
				);
			}
		}

		const pending = await consumePendingAction(pendingId, auth);
		if (!pending) {
			return NextResponse.json(
				{ error: "Action expired or not found" },
				{ status: 410 },
			);
		}

		const toolResult = await runToolByName(
			{ ...auth, pathname: body.pathname },
			pending.toolName,
			pending.args,
		);

		const resultObj =
			toolResult.result && typeof toolResult.result === "object"
				? (toolResult.result as Record<string, unknown>)
				: null;

		const isMeetingSuccess =
			pending.toolName === "create_calendar_event" &&
			resultObj &&
			!resultObj.error;

		const meetingCreated = isMeetingSuccess
			? {
					eventId:
						typeof resultObj.eventId === "string"
							? resultObj.eventId
							: undefined,
					title: String(resultObj.title ?? pending.args.title ?? "Meeting"),
					date: String(resultObj.date ?? pending.args.date ?? ""),
					startTime:
						typeof resultObj.startTime === "string"
							? resultObj.startTime
							: typeof pending.args.startTime === "string"
								? pending.args.startTime
								: undefined,
					endTime:
						typeof resultObj.endTime === "string"
							? resultObj.endTime
							: typeof pending.args.endTime === "string"
								? pending.args.endTime
								: undefined,
					description:
						typeof pending.args.description === "string"
							? pending.args.description
							: undefined,
					participants:
						typeof pending.args.participants === "string"
							? pending.args.participants
							: undefined,
					invitedCount:
						typeof resultObj.invitedCount === "number"
							? resultObj.invitedCount
							: undefined,
					calendarHref:
						typeof resultObj.calendarHref === "string"
							? resultObj.calendarHref
							: "/calendar",
					conflicts: Array.isArray(resultObj.conflicts)
						? (resultObj.conflicts as string[])
						: [],
				}
			: undefined;

		const actionCompleted =
			!toolResult.error &&
			resultObj &&
			!resultObj.error &&
			(pending.toolName === "reschedule_calendar_event" ||
				pending.toolName === "cancel_calendar_event")
				? buildCalendarActionCompleted({
						toolName: pending.toolName,
						result: resultObj,
					})
				: undefined;

		const calendarMutation = !toolResult.error
			? buildCalendarMutation(pending.toolName, resultObj)
			: undefined;

		const summary = toolResult.error
			? `Action failed: ${toolResult.error}`
			: meetingCreated
				? formatMeetingSuccessSummary({
						...meetingCreated,
						invitedCount: meetingCreated.invitedCount ?? 0,
					})
				: actionCompleted
					? `${actionCompleted.eyebrow ?? "Action completed"}: ${actionCompleted.headline}`
					: resultObj
						? resultObj.error
							? `Action failed: ${String(resultObj.error)}`
							: formatGenericSuccessSummary(pending.label, resultObj)
						: `Action completed: ${pending.label}`;

		const metadataJson =
			meetingCreated || actionCompleted || calendarMutation
				? JSON.stringify({
						...(meetingCreated ? { meetingCreated } : {}),
						...(actionCompleted ? { actionCompleted } : {}),
						...(calendarMutation ? { calendarMutation } : {}),
					})
				: undefined;

		if (conversationId) {
			await appendMessage({
				conversationId,
				userId: auth.user.$id,
				orgId: auth.orgId,
				role: "assistant",
				content: summary,
				metadataJson,
			});
			await updateConversationMeta(conversationId, {
				lastMessageAt: new Date().toISOString(),
				lastMessagePreview: truncatePreview(summary, 120),
			});
		}

		return NextResponse.json({
			success: true,
			data: {
				result: toolResult,
				summary,
				meetingCreated,
				actionCompleted,
				calendarMutation,
			},
		});
	} catch (error) {
		console.error("[assistant/execute]", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Action execution failed",
			},
			{ status: 500 },
		);
	}
}
