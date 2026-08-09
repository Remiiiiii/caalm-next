import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { extractHeadings, stripMarkdown } from "./markdown";
import { flattenDocsNav } from "./navigation";
import type { DocsFrontmatter, DocsPage, DocsSectionId } from "./types";

const CONTENT_ROOT = join(process.cwd(), "src/content/docs");

function parseFrontmatter(raw: string): {
	frontmatter: DocsFrontmatter;
	body: string;
} {
	if (!raw.startsWith("---")) {
		throw new Error("Docs page missing frontmatter");
	}
	const end = raw.indexOf("\n---", 3);
	if (end === -1) {
		throw new Error("Docs page frontmatter not closed");
	}
	const yaml = raw.slice(3, end).trim();
	const body = raw.slice(end + 4).replace(/^\s+/, "");
	const data: Record<string, string> = {};
	for (const line of yaml.split("\n")) {
		const idx = line.indexOf(":");
		if (idx === -1) continue;
		const key = line.slice(0, idx).trim();
		let value = line.slice(idx + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		data[key] = value;
	}

	const audience = data.audience
		? data.audience.split(",").map((s) => s.trim()).filter(Boolean)
		: undefined;

	return {
		frontmatter: {
			title: data.title || "Untitled",
			description: data.description || "",
			section: (data.section || "learn") as DocsSectionId,
			order: data.order ? Number(data.order) : undefined,
			audience,
			updated: data.updated,
		},
		body,
	};
}

export function getAllDocsSlugs(): string[] {
	return flattenDocsNav().map((item) => item.slug);
}

export function getDocsPage(slug: string): DocsPage | null {
	const flat = flattenDocsNav();
	const index = flat.findIndex((item) => item.slug === slug);
	if (index === -1) return null;

	const item = flat[index];
	const filePath = join(CONTENT_ROOT, `${item.path}.md`);
	if (!existsSync(filePath)) {
		return null;
	}

	const raw = readFileSync(filePath, "utf8");
	const { frontmatter, body } = parseFrontmatter(raw);
	const headings = extractHeadings(body);
	const prevItem = index > 0 ? flat[index - 1] : null;
	const nextItem = index < flat.length - 1 ? flat[index + 1] : null;

	return {
		slug: item.slug,
		path: item.path,
		frontmatter: {
			...frontmatter,
			title: frontmatter.title || item.title,
			description: frontmatter.description || item.summary || "",
			section: frontmatter.section || item.section,
		},
		markdown: body,
		headings,
		prev: prevItem ? { title: prevItem.title, slug: prevItem.slug } : null,
		next: nextItem ? { title: nextItem.title, slug: nextItem.slug } : null,
	};
}

export function getAllDocsPages(): DocsPage[] {
	return getAllDocsSlugs()
		.map((slug) => getDocsPage(slug))
		.filter((page): page is DocsPage => Boolean(page));
}

export function getDocsSearchCorpus() {
	return getAllDocsPages().map((page) => ({
		slug: page.slug,
		title: page.frontmatter.title,
		description: page.frontmatter.description,
		section: page.frontmatter.section,
		text: stripMarkdown(page.markdown),
	}));
}
