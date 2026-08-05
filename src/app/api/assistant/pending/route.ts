import { type NextRequest, NextResponse } from "next/server";
import {
	isAssistantAuthError,
	requireAssistantAccess,
} from "@/lib/assistant/auth";
import { patchPendingActionArgs } from "@/lib/assistant/tools/types";

/** Persist confirmation-card edits onto the in-memory pending action. */
export async function PATCH(request: NextRequest) {
	const auth = await requireAssistantAccess();
	if (isAssistantAuthError(auth)) return auth;

	const body = await request.json();
	const pendingId = body.pendingActionId as string | undefined;
	const argsPatch =
		body.argsPatch && typeof body.argsPatch === "object"
			? (body.argsPatch as Record<string, unknown>)
			: null;

	if (!pendingId || !argsPatch) {
		return NextResponse.json(
			{ error: "pendingActionId and argsPatch are required" },
			{ status: 400 },
		);
	}

	const patched = patchPendingActionArgs(pendingId, auth, argsPatch);
	if (!patched) {
		return NextResponse.json(
			{ error: "Action expired or not found" },
			{ status: 410 },
		);
	}

	return NextResponse.json({
		success: true,
		data: {
			id: patched.id,
			args: patched.args,
			preview: patched.preview,
		},
	});
}
