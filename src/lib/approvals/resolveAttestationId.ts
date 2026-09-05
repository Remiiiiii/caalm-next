import type { AttestationEntityType } from "@/lib/approvals/expirationAttestation.types";

export async function resolveAttestationId(
	orgId: string | undefined,
	entityType: AttestationEntityType,
	entityId: string,
): Promise<string | undefined> {
	if (!orgId || !entityId) return undefined;
	const { getAttestationForEntity } = await import(
		"@/lib/approvals/ExpirationAttestationService"
	);
	const attestation = await getAttestationForEntity(orgId, entityType, entityId);
	return attestation?.$id;
}
