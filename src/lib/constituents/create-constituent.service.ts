import { logAuditEvent } from "@/lib/services/audit-logger";
import { toDuplicateCandidates } from "./duplicates";
import { createConstituent, findDuplicateConstituents } from "./repository";
import type {
	Constituent,
	ConstituentDuplicateCandidate,
	CreateConstituentInput,
} from "./types";

export type CreateConstituentActor = {
	userId: string;
	userName: string;
	userEmail: string;
};

export type CreateConstituentResult =
	| { ok: true; constituent: Constituent }
	| {
			ok: false;
			status: 409;
			candidates: ConstituentDuplicateCandidate[];
	  };

export async function createConstituentWithDuplicateGate(input: {
	payload: CreateConstituentInput;
	force: boolean;
	actor: CreateConstituentActor;
}): Promise<CreateConstituentResult> {
	const candidates = await findDuplicateConstituents({
		orgId: input.payload.orgId,
		firstName: input.payload.firstName,
		lastName: input.payload.lastName,
		email: input.payload.email,
	});

	if (candidates.length > 0 && !input.force) {
		return {
			ok: false,
			status: 409,
			candidates: toDuplicateCandidates(candidates),
		};
	}

	const constituent = await createConstituent(input.payload);

	if (candidates.length > 0 && input.force) {
		await logAuditEvent({
			event_id: constituent.$id,
			event_title: `${input.payload.firstName} ${input.payload.lastName}`.trim(),
			action: "create",
			source: "caalm",
			user_id: input.actor.userId,
			user_name: input.actor.userName,
			user_email: input.actor.userEmail,
			orgId: input.payload.orgId,
			status: "success",
			module: "governance",
			target_type: "constituent",
			target_id: constituent.$id,
			target_label: `${input.payload.firstName} ${input.payload.lastName}`.trim(),
			summary: `Force-created constituent despite ${candidates.length} duplicate candidate(s)`,
			metadata: {
				skippedCandidateIds: candidates.map((row) => row.$id),
				actorUserId: input.actor.userId,
			},
		});
	}

	return { ok: true, constituent };
}
