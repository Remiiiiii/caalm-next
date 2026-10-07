export type NewsFeedType =
	| "rss"
	| "atom"
	| "wordpress_api"
	| "linkedin"
	| "x";

export type NewsArticleSource =
	| "native"
	| "rss"
	| "atom"
	| "wordpress_api"
	| "linkedin"
	| "x"
	| "system";

export type IngestItem = {
	externalId: string;
	title: string;
	excerpt: string;
	canonicalUrl: string;
	imageUrl?: string | null;
	publishedAt?: string | null;
	author?: string | null;
};

export const EXCERPT_MAX_LENGTH = 2000;
export const TITLE_MAX_LENGTH = 200;
export const IMPORT_CONTENT_MAX_LENGTH = 4000;
