import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getNewsArticle } from "@/lib/database/news-articles";
import { recordNewsReadReceipt } from "@/lib/database/news-read-receipts";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function POST(request: NextRequest) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}
	const { articleId } = await request.json();
	const article = await getNewsArticle(articleId);
	if (!article || article.orgId !== org.orgId) {
		return NextResponse.json({ error: "Article not found" }, { status: 404 });
	}
	await recordNewsReadReceipt({
		orgId: org.orgId,
		userId: user.$id,
		articleId,
	});
	return NextResponse.json({ success: true });
}
