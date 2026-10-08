import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { logNewsAudit } from "@/lib/news/audit";
import {
	isNewsAiAssistEnabled,
	runNewsAiAssist,
} from "@/lib/news/ai/assist";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

const schema = z.object({
	mode: z.enum(["draft_from_text", "summarize", "suggest"]),
	text: z.string().trim().min(1).max(8000),
});

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.CREATE,
	});
	if (denied) return denied;
	if (!isNewsAiAssistEnabled()) {
		return NextResponse.json(
			{ error: "AI assist is disabled" },
			{ status: 404 },
		);
	}
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const parsed = schema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}
	const result = await runNewsAiAssist(parsed.data);
	const org = await getUserDefaultOrganization(user.$id);
	await logNewsAudit({
		action: "create",
		eventId: `news_ai_assist_${user.$id}_${Date.now()}`,
		eventTitle: "News AI assist draft",
		userId: user.$id,
		userName: user.fullName || user.email,
		userEmail: user.email,
		orgId: org?.orgId,
		targetId: "ai-draft",
		targetLabel: result.title,
		summary: `${user.fullName || user.email} generated an AI news draft`,
	});
	return NextResponse.json({ draft: result });
}
