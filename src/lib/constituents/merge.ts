import { logConstituentAudit, type ConstituentActor } from "./audit";
import { countGiftsForConstituent } from "./timeline";
import { listNotesForConstituent, restoreNoteTargets, retargetNotes } from "./notes";
import {
	listRelationshipsForConstituent,
	restoreRelationshipTargets,
	retargetRelationships,
} from "./relationships";
import { getConstituentById, updateConstituent } from "./repository";
import type { Constituent } from "./types";

const DIFF_FIELDS = [
	"firstName",
	"lastName",
	"email",
	"phone",
	"addressLine1",
	"city",
	"type",
	"doNotContact",
] as const;

export type MergeFieldDiff = {
	field: (typeof DIFF_FIELDS)[number];
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

export async function loadSameOrgPair(input: {
	winnerId: string;
	loserId: string;
	orgId: string;
}): Promise<
	| { ok: true; winner: Constituent; loser: Constituent }
	| { ok: false; status: 400 | 404; error: string }
> {
	if (input.winnerId === input.loserId) {
		return { ok: false, status: 400, error: "Winner and loser must differ" };
	}
	const [winner, loser] = await Promise.all([
		getConstituentById(input.winnerId),
		getConstituentById(input.loserId),
	]);
	if (
		!winner ||
		!loser ||
		winner.orgId !== input.orgId ||
		loser.orgId !== input.orgId
	) {
		return { ok: false, status: 404, error: "Constituent not found" };
	}
	if (winner.mergedIntoId || loser.mergedIntoId) {
		return { ok: false, status: 400, error: "One record is already merged" };
	}
	return { ok: true, winner, loser };
}

/** Dry-run only — this function must not write rows. */
export async function previewConstituentMerge(input: {
	winnerId: string;
	loserId: string;
	orgId: string;
}): Promise<
	| { ok: true; preview: MergePreview }
	| { ok: false; status: 400 | 404; error: string }
> {
	const pair = await loadSameOrgPair(input);
	if (!pair.ok) return pair;

	const [relationships, notes, giftCountLoser, giftCountWinner] =
		await Promise.all([
			listRelationshipsForConstituent(pair.loser.$id, input.orgId),
			listNotesForConstituent(pair.loser.$id, input.orgId),
			countGiftsForConstituent(pair.loser.$id, input.orgId),
			countGiftsForConstituent(pair.winner.$id, input.orgId),
		]);

	const fieldDiffs: MergeFieldDiff[] = DIFF_FIELDS.map((field) => ({
		field,
		winner: pair.winner[field],
		loser: pair.loser[field],
	}));

	return {
		ok: true,
		preview: {
			winnerId: pair.winner.$id,
			loserId: pair.loser.$id,
			fieldDiffs,
			giftCountLoser,
			giftCountWinner,
			relationshipCountLoser: relationships.length,
			noteCountLoser: notes.length,
		},
	};
}

/**
 * All-or-nothing commit: move notes/relationships, then stamp mergedIntoId.
 * If a later write fails, earlier moves are rolled back so both records
 * look unchanged.
 */
export async function commitConstituentMerge(input: {
	winnerId: string;
	loserId: string;
	orgId: string;
	actor: ConstituentActor;
}): Promise<
	| { ok: true; winnerId: string; loserId: string }
	| { ok: false; status: 400 | 404 | 500; error: string }
> {
	const pair = await loadSameOrgPair(input);
	if (!pair.ok) return pair;

	const relationshipSnapshot = await listRelationshipsForConstituent(
		pair.loser.$id,
		input.orgId,
	);
	const noteSnapshot = await listNotesForConstituent(pair.loser.$id, input.orgId);

	try {
		await retargetRelationships({
			loserId: pair.loser.$id,
			winnerId: pair.winner.$id,
			orgId: input.orgId,
		});
		await retargetNotes({
			loserId: pair.loser.$id,
			winnerId: pair.winner.$id,
			orgId: input.orgId,
		});
		await updateConstituent(pair.loser.$id, {
			mergedIntoId: pair.winner.$id,
		});
	} catch {
		await restoreRelationshipTargets(relationshipSnapshot);
		await restoreNoteTargets(noteSnapshot);
		return {
			ok: false,
			status: 500,
			error: "Merge failed; both records are unchanged",
		};
	}

	await logConstituentAudit({
		action: "update",
		actor: input.actor,
		orgId: input.orgId,
		targetId: pair.winner.$id,
		targetLabel: `${pair.winner.firstName} ${pair.winner.lastName}`.trim(),
		summary: `Merged constituent ${pair.loser.$id} into ${pair.winner.$id}`,
		metadata: {
			winnerId: pair.winner.$id,
			loserId: pair.loser.$id,
			actorUserId: input.actor.userId,
		},
	});

	return { ok: true, winnerId: pair.winner.$id, loserId: pair.loser.$id };
}
