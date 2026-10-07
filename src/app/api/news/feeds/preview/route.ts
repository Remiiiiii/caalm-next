import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { parseRssOrAtom } from "@/lib/news/ingest/parse-rss-atom";
import {
	parseWordpressJson,
	wordpressApiUrl,
} from "@/lib/news/ingest/parse-wordpress";
import { safeFetchText } from "@/lib/news/ingest/safe-fetch";
import { requirePermission } from "@/lib/rbac/middleware";

const schema = z.object({
	type: z.enum(["rss", "atom", "wordpress_api"]),
	url: z.string().url(),
});

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.NEWS.FEEDS_MANAGE,
	});
	if (denied) return denied;

	const parsed = schema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid feed URL" }, { status: 400 });
	}

	try {
		const fetchUrl =
			parsed.data.type === "wordpress_api"
				? wordpressApiUrl(parsed.data.url)
				: parsed.data.url;
		const result = await safeFetchText(fetchUrl);
		if (!result) {
			return NextResponse.json({ items: [], message: "Feed not modified" });
		}
		const items =
			parsed.data.type === "wordpress_api"
				? parseWordpressJson(JSON.parse(result.body))
				: parseRssOrAtom(result.body);
		return NextResponse.json({ items: items.slice(0, 10) });
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Feed test failed",
			},
			{ status: 400 },
		);
	}
}
