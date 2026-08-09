export type DocsSectionId =
	| "learn"
	| "concepts"
	| "guides"
	| "reference"
	| "admin"
	| "troubleshooting";

export type DocsNavItem = {
	title: string;
	slug: string;
	/** Path under src/content/docs without extension */
	path: string;
	summary?: string;
};

export type DocsNavGroup = {
	id: DocsSectionId;
	title: string;
	description: string;
	items: DocsNavItem[];
};

export type DocsFrontmatter = {
	title: string;
	description: string;
	section: DocsSectionId;
	order?: number;
	audience?: string[];
	updated?: string;
};

export type DocsHeading = {
	id: string;
	text: string;
	level: 2 | 3;
};

export type DocsPage = {
	slug: string;
	path: string;
	frontmatter: DocsFrontmatter;
	markdown: string;
	headings: DocsHeading[];
	prev: { title: string; slug: string } | null;
	next: { title: string; slug: string } | null;
};

export type DocsSearchHit = {
	slug: string;
	title: string;
	description: string;
	section: DocsSectionId;
	snippet: string;
	score: number;
};
