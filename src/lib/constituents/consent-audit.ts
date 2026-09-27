import type { ConstituentActor } from "./audit";
import { logConstituentAudit } from "./audit";
import type { ChannelConsentSnapshot } from "./consent-fields";

const CONSENT_FIELDS = [
	"consentEmail",
	"consentSms",
	"consentMail",
	"consentPhone",
	"lawfulBasis",
] as const;

export function consentAuditChanges(
	before: ChannelConsentSnapshot,
	after: ChannelConsentSnapshot,
): Record<string, { before: unknown; after: unknown }> | null {
	const changes: Record<string, { before: unknown; after: unknown }> = {};
	for (const key of CONSENT_FIELDS) {
		const prev = before[key];
		const next = after[key];
		if (prev !== next) {
			changes[key] = { before: prev ?? null, after: next ?? null };
		}
	}
	return Object.keys(changes).length ? changes : null;
}

export async function logConstituentConsentChange(input: {
	actor: ConstituentActor;
	orgId: string;
	constituentId: string;
	changes: Record<string, { before: unknown; after: unknown }>;
}): Promise<void> {
	await logConstituentAudit({
		action: "update",
		actor: input.actor,
		orgId: input.orgId,
		targetId: input.constituentId,
		targetLabel: "Constituent channel consent",
		summary: "Updated constituent channel consent",
		metadata: { consentChanges: input.changes },
	});
}
