const GOOGLE_NEWS_ARTICLE =
	/^https:\/\/news\.google\.com\/(?:rss\/)?articles\/([^/?#]+)/i;

export function isGoogleNewsArticleUrl(url: string): boolean {
	return GOOGLE_NEWS_ARTICLE.test(url);
}

export function googleNewsArticleId(url: string): string | null {
	return url.match(GOOGLE_NEWS_ARTICLE)?.[1] ?? null;
}

/** Google News og:image is their logo, not the publisher photo. */
export function isUsableNewsImage(url: string | null | undefined): boolean {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return false;
		}
		const host = parsed.hostname.toLowerCase();
		if (host === "news.google.com" || host.endsWith(".gstatic.com")) {
			return false;
		}
		if (host.endsWith(".googleusercontent.com")) return false;
		if (parsed.pathname === "/" || parsed.pathname === "") return false;
		return true;
	} catch {
		return false;
	}
}

const BLOCKED_VIDEO_HOSTS = [
	"youtube.com",
	"youtu.be",
	"vimeo.com",
	"news.google.com",
];

/** HTML5 video can play MP4/WebM/Ogg. Skip YouTube embeds and HLS playlists. */
export function isPlayableNewsVideo(url: string | null | undefined): boolean {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return false;
		}
		const host = parsed.hostname.toLowerCase();
		if (
			BLOCKED_VIDEO_HOSTS.some(
				(blocked) => host === blocked || host.endsWith(`.${blocked}`),
			)
		) {
			return false;
		}
		const path = `${parsed.pathname}${parsed.search}`.toLowerCase();
		if (/\.m3u8(\?|$)/.test(path) || /\.mpd(\?|$)/.test(path)) {
			return false;
		}
		return /\.(mp4|webm|ogg)(\?|$)/i.test(path);
	} catch {
		return false;
	}
}

export function parseGoogleNewsDecodeParams(html: string): {
	articleId: string;
	signature: string;
	timestamp: string;
} | null {
	const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
	const timestamp = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
	const articleId = html.match(/data-n-a-id="([^"]+)"/)?.[1];
	if (!signature || !timestamp || !articleId) return null;
	return { articleId, signature, timestamp };
}

export function parseGoogleNewsPublisherUrl(body: string): string | null {
	const jsonStart = body.indexOf("[");
	if (jsonStart < 0) return null;
	try {
		const rows = JSON.parse(body.slice(jsonStart)) as unknown;
		if (!Array.isArray(rows)) return null;
		const envelope = rows.find(
			(row) =>
				Array.isArray(row) && row[0] === "wrb.fr" && row[1] === "Fbv4je",
		);
		if (!Array.isArray(envelope) || typeof envelope[2] !== "string") {
			return null;
		}
		const payload = JSON.parse(envelope[2]) as unknown;
		if (
			Array.isArray(payload) &&
			payload[0] === "garturlres" &&
			typeof payload[1] === "string" &&
			payload[1].startsWith("http")
		) {
			return payload[1];
		}
	} catch {
		return null;
	}
	return null;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Google News RSS links are opaque wrappers. Since 2024 the publisher URL is
 * not in the path; Google returns it from this batchexecute call.
 */
export async function resolveGoogleNewsPublisherUrl(
	googleUrl: string,
	get: FetchLike,
	userAgent: string,
): Promise<string | null> {
	if (!isGoogleNewsArticleUrl(googleUrl)) return null;
	try {
		const page = await get(googleUrl, {
			headers: { Accept: "text/html", "User-Agent": userAgent },
		});
		if (!page.ok) return null;
		const params = parseGoogleNewsDecodeParams(await page.text());
		if (!params) return null;

		const requestBody = [
			"garturlreq",
			[
				[
					"en-US",
					"US",
					["FINANCE_TOP_INDICES", "WEB_TEST_1_0_0"],
					null,
					null,
					1,
					1,
					"US:en",
					null,
					1,
					null,
					null,
					null,
					null,
					null,
					0,
					1,
				],
				"en-US",
				"US",
				1,
				[1, 1, 1],
				1,
				1,
				null,
				0,
				0,
				null,
				0,
			],
			params.articleId,
			Number(params.timestamp),
			params.signature,
		];
		const fReq = JSON.stringify([
			[["Fbv4je", JSON.stringify(requestBody), null, "generic"]],
		]);
		const post = await get(
			"https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je",
			{
				method: "POST",
				headers: {
					"Content-Type":
						"application/x-www-form-urlencoded;charset=UTF-8",
					Referer: "https://news.google.com/",
					"User-Agent": userAgent,
				},
				body: `f.req=${encodeURIComponent(fReq)}`,
			},
		);
		if (!post.ok) return null;
		return parseGoogleNewsPublisherUrl(await post.text());
	} catch {
		return null;
	}
}
