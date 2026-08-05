import { type NextRequest, NextResponse } from "next/server";
import {
	isAssistantAuthError,
	requireAssistantAccess,
} from "@/lib/assistant/auth";
import {
	appendMessage,
	truncatePreview,
	updateConversationMeta,
} from "@/lib/assistant/conversationStore";
import { runToolByName } from "@/lib/assistant/tools/registry";
import {
	consumePendingAction,
	patchPendingActionArgs,
} from "@/lib/assistant/tools/types";

function formatMeetingSuccessSummary(result: Record<string, unknown>): string {
	const title = String(result.title ?? "Meeting");
	const date = String(result.date ?? "");
	const start = result.startTime ? String(result.startTime) : "";
	const end = result.endTime ? String(result.endTime) : "";
	const time =
		start && end ? `${start} – ${end}` : start || end || "time TBD";
	const invited = Number(result.invitedCount) || 0;
	const inviteLine =
		invited > 0
			? `${invited} ${invited === 1 ? "person" : "people"} invited.`
			: "No invitees added.";
	return `Meeting successfully created.\n\n**${title}**\n${date} · ${time}\n${inviteLine}`;
}

function formatGenericSuccessSummary(
	label: string,
	result: unknown,
): string {
	if (result && typeof result === "object") {
		const entries = Object.entries(result as Record<string, unknown>)
			.filter(
				([key, value]) =>
					value !== undefined &&
					value !== null &&
					key !== "calendarHref" &&
					!(Array.isArray(value) && value.length === 0),
			)
			.slice(0, 8)
			.map(([key, value]) => {
				const labelText = key
					.replace(/([A-Z])/g, " $1")
					.replace(/^./, (c) => c.toUpperCase())
					.trim();
				return `- **${labelText}:** ${String(value)}`;
			});
		if (entries.length) {
			return `Action completed: ${label}\n\n${entries.join("\n")}`;
		}
	}
	return `Action completed: ${label}`;
}

export async function POST(request: NextRequest) {
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
		const patched = patchPendingActionArgs(pendingId, auth, argsPatch);
		if (!patched) {
			return NextResponse.json(
				{ error: "Action expired or not found" },
				{ status: 410 },
			);
		}
	}

	const pending = consumePendingAction(pendingId, auth);
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
					typeof resultObj.eventId === "string" ? resultObj.eventId : undefined,
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

	const summary = toolResult.error
		? `Action failed: ${toolResult.error}`
		: meetingCreated
			? formatMeetingSuccessSummary({
					...meetingCreated,
					invitedCount: meetingCreated.invitedCount ?? 0,
				})
			: resultObj
				? resultObj.error
					? `Action failed: ${String(resultObj.error)}`
					: formatGenericSuccessSummary(pending.label, resultObj)
				: `Action completed: ${pending.label}`;

	const metadataJson = meetingCreated
		? JSON.stringify({ meetingCreated })
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
		},
	});
}
