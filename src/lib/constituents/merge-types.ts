/** Client-safe merge preview shapes (no server imports). */

export type MergeFieldDiff = {
	field: string;
	winner: string | boolean | undefined;
	loser: string | boolean | undefined;
};

export type MergePreview = {
	winnerId: string;
	loserId: string;
	fieldDiffs: MergeFieldDiff[];
	giftCountLoser: number;
	giftCountWinner: number;
	relationshipCountLoser: number;
	noteCountLoser: number;
};
