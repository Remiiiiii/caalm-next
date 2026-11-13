/**
 * Docs video embeds: a fenced code block tagged `video` whose body is JSON.
 *
 * ```video
 * {"embed": "https://watchclueso.com/embed/<id>", "poster": "/assets/video/docs/x.webp", "title": "…", "duration": "1:13"}
 * ```
 *
 * The player is hosted by Clueso (embed URL never changes; re-publishing updates it in
 * place), so the video never counts against the site's Vercel bandwidth. Only https
 * embeds on an allowlisted host render; anything else falls back to a plain code block.
 */
export type DocsVideoSpec = {
	embed: string;
	poster: string;
	title: string;
	duration?: string;
};

/** Clueso serves published embeds from watchclueso.com (e.g. https://watchclueso.com/embed/<id>). */
const EMBED_HOST_SUFFIXES = ["watchclueso.com", "clueso.io"] as const;

function isAllowedEmbed(url: string): boolean {
	try {
		const u = new URL(url);
		if (u.protocol !== "https:") return false;
		return EMBED_HOST_SUFFIXES.some(
			(suffix) => u.hostname === suffix || u.hostname.endsWith(`.${suffix}`),
		);
	} catch {
		return false;
	}
}

function isAllowedPoster(path: string): boolean {
	return /^\/assets\/[\w\-/.]+\.(webp|png|jpe?g)$/i.test(path);
}

export function parseDocsVideo(code: string): DocsVideoSpec | null {
	let raw: unknown;
	try {
		raw = JSON.parse(code);
	} catch {
		return null;
	}
	if (!raw || typeof raw !== "object") return null;
	const { embed, poster, title, duration } = raw as Record<string, unknown>;
	if (typeof embed !== "string" || !isAllowedEmbed(embed)) return null;
	if (typeof poster !== "string" || !isAllowedPoster(poster)) return null;
	if (typeof title !== "string" || !title.trim()) return null;
	if (duration !== undefined && typeof duration !== "string") return null;
	return {
		embed,
		poster,
		title: title.trim(),
		...(duration ? { duration } : {}),
	};
}
