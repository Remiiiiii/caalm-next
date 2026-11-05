import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	type AuditRemediationContext,
	buildAuditRemediationContext,
	conversationTitleForRemediation,
	parseAuditRemediationLaunch,
} from "@/lib/assistant/audit-remediation-context";
import {
	isAssistantAuthError,
	requireAssistantAccess,
} from "@/lib/assistant/auth";
import {
	appendMessage,
	getActiveConversation,
	getConversationForUser,
	setConversationActive,
	truncatePreview,
	updateConversationMeta,
} from "@/lib/assistant/conversationStore";
import { checkAssistantRateLimit } from "@/lib/assistant/rateLimit";
import { runAssistantTurn } from "@/lib/assistant/runAssistantTurn";
import { getFinding, listCaps } from "@/lib/audit-upload/store";

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAssistantAccess();
		if (isAssistantAuthError(auth)) return auth;

		const rate = checkAssistantRateLimit(auth.user.$id);
		if (!rate.allowed) {
			return NextResponse.json(
				{ error: "Rate limit exceeded. Try again later." },
				{ status: 429 },
			);
		}

		const body = await request.json();
		const conversationId = body.conversationId as string | undefined;
		const message = typeof body.message === "string" ? body.message.trim() : "";
		/** Continue Show me how after confirm — do not store a second user bubble. */
		const suppressUserMessage = body.suppressUserMessage === true;
		const pathname =
			typeof body.pathname === "string" ? body.pathname : undefined;
		const launch = parseAuditRemediationLaunch(body.launchContext);
		const contextRoutes = Array.isArray(body.contextRoutes)
			? (body.contextRoutes as unknown[])
					.filter(
						(route): route is string =>
							typeof route === "string" && route.startsWith("/"),
					)
					.slice(0, 8)
			: [];

		if (launch === "invalid") {
			return NextResponse.json(
				{ error: "Invalid launch context." },
				{ status: 400 },
			);
		}

		if (!message) {
			return NextResponse.json(
				{ error: "Message is required" },
				{ status: 400 },
			);
		}

		let remediationContext: AuditRemediationContext | undefined;
		if (launch) {
			if (!auth.permissions.includes(PERMISSIONS.AUDIT.DOCUMENTS_VIEW)) {
				return NextResponse.json(
					{ error: "Permission denied. audit.documents_view is required." },
					{ status: 403 },
				);
			}
			const finding = await getFinding(auth.orgId, launch.findingId);
			if (!finding || finding.documentId !== launch.documentId) {
				return NextResponse.json(
					{ error: "Finding not found." },
					{ status: 404 },
				);
			}
			const caps = await listCaps({
				orgId: auth.orgId,
				documentId: launch.documentId,
				limit: 50,
			});
			const cap = caps.find((row) => row.findingId === finding.$id) ?? null;
			remediationContext = buildAuditRemediationContext({ finding, cap });
		}

		let convId = conversationId;
		if (!convId) {
			// Resume the current active session instead of spawning a new one on remount/hide.
			const active = await getActiveConversation(auth.user.$id, auth.orgId);
			if (active) {
				convId = active.$id;
			} else {
				const { createConversation } = await import(
					"@/lib/assistant/conversationStore"
				);
				const created = await createConversation({
					userId: auth.user.$id,
					orgId: auth.orgId,
					title: truncatePreview(message, 80),
				});
				convId = created.$id;
			}
		} else {
			const existing = await getConversationForUser(
				convId,
				auth.user.$id,
				auth.orgId,
			);
			if (!existing) {
				return NextResponse.json({ error: "Not found" }, { status: 404 });
			}
			if (existing.status === "closed") {
				return NextResponse.json(
					{
						error: "This conversation is closed. Start a new chat to continue.",
					},
					{ status: 409 },
				);
			}
			await setConversationActive({
				conversationId: convId,
				userId: auth.user.$id,
				orgId: auth.orgId,
			});
		}

		const history =
			(Array.isArray(body.history) &&
				body.history
					.filter(
						(m: { role?: string; content?: string }) => m?.role && m?.content,
					)
					.map((m: { role: string; content: string }) => ({
						role: m.role === "assistant" ? "assistant" : "user",
						content: String(m.content),
					}))) ||
			[];

		if (!suppressUserMessage) {
			await appendMessage({
				conversationId: convId,
				userId: auth.user.$id,
				orgId: auth.orgId,
				role: "user",
				content: message,
			});
		}

		const turn = await runAssistantTurn({
			ctx: auth,
			messages: history,
			userMessage: message,
			pathname,
			remediationContext,
			contextRoutes,
		});

		await appendMessage({
			conversationId: convId,
			userId: auth.user.$id,
			orgId: auth.orgId,
			role: "assistant",
			content: turn.answer,
			sourcesJson: JSON.stringify(turn.sources),
			metadataJson: JSON.stringify({
				...(turn.pendingAction
					? { pendingActionId: turn.pendingAction.id }
					: {}),
				...(turn.suggestions?.length ? { suggestions: turn.suggestions } : {}),
				...(turn.activityFeed ? { activityFeed: turn.activityFeed } : {}),
				...(turn.inputForm ? { inputForm: turn.inputForm } : {}),
				...(turn.researchSteps?.length
					? { researchSteps: turn.researchSteps }
					: {}),
			}),
		});

		const now = new Date().toISOString();
		await updateConversationMeta(convId, {
			lastMessageAt: now,
			lastMessagePreview: truncatePreview(
				turn.answer.replace(/[#*`]/g, ""),
				120,
			),
			title: remediationContext
				? truncatePreview(
						conversationTitleForRemediation(remediationContext),
						80,
					)
				: truncatePreview(message, 80),
		});

		return NextResponse.json({
			success: true,
			data: {
				conversationId: convId,
				answer: turn.answer,
				sources: turn.sources,
				suggestions: turn.suggestions ?? [],
				pendingAction: turn.pendingAction,
				clientAction: turn.clientAction,
				activityFeed: turn.activityFeed,
				inputForm: turn.inputForm,
				researchSteps: turn.researchSteps,
			},
		});
	} catch (error) {
		console.error("[assistant/chat]", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Assistant chat failed",
			},
			{ status: 500 },
		);
	}
}
