/**
 * Text-cleanup for Gmail message bodies.
 * LinkedIn "People you may know" emails get a structured Markdown rewrite;
 * other mail gets a light readability pass (no URL stripping).
 */

export type CleanEmailOptions = {
	/** Print shortened LinkedIn paths without scheme instead of [Connect](url). */
	rawLinks?: boolean;
};

export type CleanEmailResult = {
	markdown: string;
	notes: string[];
	isLinkedInPymk: boolean;
};

export function cleanEmailBody(
	plainText: string,
	html: string,
	options: CleanEmailOptions = {},
): CleanEmailResult {
	const source = preferSourceText(plainText, html);
	const rejoined = rejoinBrokenUrls(source);

	if (isLinkedInPeopleYouMayKnow(rejoined)) {
		return formatLinkedInPeopleYouMayKnow(rejoined, options);
	}

	return {
		markdown: mildCleanup(rejoined),
		notes: [],
		isLinkedInPymk: false,
	};
}

function preferSourceText(plainText: string, html: string): string {
	const plain = (plainText || "").trim();
	const fromHtml = html ? htmlToPlain(html) : "";
	if (!plain) return fromHtml;
	if (!fromHtml) return plain;
	// Prefer the version that still carries LinkedIn invite URLs when present
	if (
		/linkedin\.com\/comm\/mynetwork\/send-invite/i.test(plain) ||
		/Do you know /i.test(plain)
	) {
		return plain;
	}
	if (
		/linkedin\.com\/comm\/mynetwork\/send-invite/i.test(fromHtml) ||
		/Do you know /i.test(fromHtml)
	) {
		return fromHtml;
	}
	return plain.length >= fromHtml.length ? plain : fromHtml;
}

function decodeEntities(text: string): string {
	return text
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, h) =>
			String.fromCharCode(Number.parseInt(h, 16)),
		);
}

function htmlToPlain(html: string): string {
	return decodeEntities(
		html
			.replace(/<style[\s\S]*?<\/style>/gi, "")
			.replace(/<script[\s\S]*?<\/script>/gi, "")
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<\/(p|div|tr|li|h[1-6]|table|section|article)>/gi, "\n")
			.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
				const inner = String(label).replace(/<[^>]+>/g, "").trim();
				return `${inner}\n${href}\n`;
			})
			.replace(/<[^>]+>/g, " ")
			.replace(/[ \t]+\n/g, "\n")
			.replace(/\n{3,}/g, "\n\n"),
	).trim();
}

/** Rejoin URLs that were split across lines (common in plain-text email). */
export function rejoinBrokenUrls(text: string): string {
	return text.replace(
		/(https?:\/\/[^\s]*)\n([^\s]+)/gi,
		(full, start: string, cont: string) => {
			// Continue joining while the next piece looks like a URL continuation
			if (/^[a-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+$/i.test(cont)) {
				return `${start}${cont}`;
			}
			return full;
		},
	);
}

export function shortenInviteUrl(url: string): {
	url: string;
	flagged: boolean;
} {
	const trimmed = url.trim();
	try {
		const parsed = new URL(trimmed);
		const isLinkedIn =
			/(^|\.)linkedin\.com$/i.test(parsed.hostname) ||
			/(^|\.)lnkd\.in$/i.test(parsed.hostname);
		if (!isLinkedIn) {
			return { url: trimmed, flagged: true };
		}
		const path = parsed.pathname.endsWith("/")
			? parsed.pathname
			: `${parsed.pathname}/`;
		return {
			url: `${parsed.protocol}//${parsed.host}${path}`,
			flagged: false,
		};
	} catch {
		const withoutQuery = trimmed.split("?")[0];
		const withSlash = withoutQuery.endsWith("/")
			? withoutQuery
			: `${withoutQuery}/`;
		const flagged = !/linkedin\.com|lnkd\.in/i.test(withSlash);
		return { url: withSlash, flagged };
	}
}

function isLinkedInPeopleYouMayKnow(text: string): boolean {
	return (
		/Do you know\s+.+\?/i.test(text) ||
		(/More people you may know/i.test(text) &&
			/linkedin\.com\/comm\/mynetwork\/send-invite/i.test(text))
	);
}

type Person = {
	name: string;
	headline?: string;
	url: string;
};

function formatConnect(url: string, rawLinks: boolean): string {
	if (rawLinks) {
		return url.replace(/^https?:\/\//i, "");
	}
	return `[Connect](${url})`;
}

export function formatLinkedInPeopleYouMayKnow(
	raw: string,
	options: CleanEmailOptions = {},
): CleanEmailResult {
	const notes: string[] = [];
	const text = rejoinBrokenUrls(decodeEntities(raw));
	const rawLinks = Boolean(options.rawLinks);

	const urlRe =
		/https?:\/\/(?:www\.)?(?:linkedin\.com|lnkd\.in)[^\s<>"')\]]+/gi;
	const allUrls = text.match(urlRe) || [];

	let featured: Person | null = null;
	const featuredMatch = text.match(
		/Do you know\s+(.+?)\?\s*(?:Yes,?\s*connect:?\s*)?(https?:\/\/[^\s]+)?/i,
	);
	if (featuredMatch) {
		const name = featuredMatch[1].trim();
		let url = featuredMatch[2];
		if (!url) {
			// URL may be on the next line(s) after "Yes, connect:"
			const after = text.slice(featuredMatch.index! + featuredMatch[0].length);
			const nextUrl = after.match(/https?:\/\/[^\s]+/i);
			url = nextUrl?.[0];
		}
		if (url) {
			const shortened = shortenInviteUrl(url);
			if (shortened.flagged) {
				notes.push(`Non-LinkedIn URL kept as-is for featured: ${name}`);
			}
			featured = { name, url: shortened.url };
		}
	}

	const more: Person[] = [];
	const moreIdx = text.search(/More people you may know/i);
	if (moreIdx >= 0) {
		const section = text.slice(moreIdx).replace(/^More people you may know\s*/i, "");
		// Split around invite URLs; each chunk before a URL is name + optional headline
		const parts = section.split(/(https?:\/\/[^\s<>"')\]]+)/i);
		for (let i = 0; i < parts.length - 1; i += 2) {
			const block = parts[i].trim();
			const urlRaw = parts[i + 1];
			if (!urlRaw || !/^https?:\/\//i.test(urlRaw)) continue;
			if (!/linkedin\.com\/comm\/mynetwork\/send-invite|lnkd\.in/i.test(urlRaw)) {
				// Skip the featured URL if it appears again in this section
				continue;
			}
			const lines = block
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter(Boolean)
				.filter(
					(l) =>
						!/^Yes,?\s*connect:?$/i.test(l) &&
						!/^More people you may know$/i.test(l),
				);
			if (lines.length === 0) continue;
			const name = lines[0];
			// Skip if this is the featured person duplicated
			if (featured && name === featured.name) continue;
			const headline = lines.length > 1 ? lines.slice(1).join(" ") : undefined;
			const shortened = shortenInviteUrl(urlRaw);
			if (shortened.flagged) {
				notes.push(`Non-LinkedIn URL kept as-is for: ${name}`);
			}
			more.push({
				name,
				headline: headline || undefined,
				url: shortened.url,
			});
		}

		// Truncation note: section ends mid-name without a URL
		const trailing = parts[parts.length - 1]?.trim();
		if (trailing && !/^https?:\/\//i.test(trailing)) {
			const leftover = trailing
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter(Boolean);
			if (leftover.length > 0 && leftover[0].length > 1) {
				notes.push(
					`Input looked truncated after: ${leftover.slice(0, 2).join(" / ")}`,
				);
			}
		}
	}

	// Dedupe by shortened URL
	const seen = new Set<string>();
	const dedupe = (p: Person): Person | null => {
		if (seen.has(p.url)) return null;
		seen.add(p.url);
		return p;
	};

	if (featured) {
		const d = dedupe(featured);
		featured = d;
	}
	const uniqueMore = more.map(dedupe).filter(Boolean) as Person[];

	const lines: string[] = [];
	if (featured) {
		lines.push(`**Do you know ${featured.name}?**`);
		lines.push(formatConnect(featured.url, rawLinks));
		lines.push("");
		lines.push("---");
		lines.push("");
	}

	if (uniqueMore.length > 0 || /More people you may know/i.test(text)) {
		lines.push("**More people you may know**");
		lines.push("");
		for (const person of uniqueMore) {
			lines.push(`**${person.name}**`);
			if (person.headline) {
				lines.push(person.headline);
			}
			lines.push(formatConnect(person.url, rawLinks));
			lines.push("");
		}
	}

	// Fallback: if we only found URLs but no names, list Connect links
	if (!featured && uniqueMore.length === 0 && allUrls.length > 0) {
		notes.push("Could not parse names; listing shortened invite links only.");
		for (const u of allUrls) {
			const shortened = shortenInviteUrl(u);
			if (seen.has(shortened.url)) continue;
			seen.add(shortened.url);
			lines.push(formatConnect(shortened.url, rawLinks));
		}
	}

	return {
		markdown: lines.join("\n").trim(),
		notes,
		isLinkedInPymk: true,
	};
}

function mildCleanup(text: string): string {
	return decodeEntities(text)
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
