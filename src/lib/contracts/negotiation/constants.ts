export const VERSION_SOURCES = [
	"wizard_submit",
	"manual_upload",
	"redline_accept",
] as const;

export type VersionSource = (typeof VERSION_SOURCES)[number];

export const COMMENT_STATUSES = ["open", "resolved"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const AUTHOR_TYPES = ["internal", "counterparty"] as const;
export type AuthorType = (typeof AUTHOR_TYPES)[number];

export const ANCHOR_TYPES = ["paragraph", "selection"] as const;
export type AnchorType = (typeof ANCHOR_TYPES)[number];

export const COMMENT_VISIBILITIES = ["shared", "internal"] as const;
export type CommentVisibility = (typeof COMMENT_VISIBILITIES)[number];

export const NEGOTIATION_LIFECYCLE = "negotiation" as const;

export const ELIGIBLE_START_LIFECYCLES = ["draft", "negotiation"] as const;
