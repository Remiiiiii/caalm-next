import { signatureHintFromEnvelope } from "@/lib/contracts/contractLifecycleDisplay";
import { getEnvelopesByIds } from "@/lib/esign/envelope-repository";
import type { UIFileDoc } from "@/types/files";

/** Attach glanceable e-sign progress onto list rows without N+1 envelope reads. */
export async function enrichContractFilesForList(
	files: UIFileDoc[],
): Promise<UIFileDoc[]> {
	const envelopeIds = [
		...new Set(
			files
				.filter(
					(file) =>
						file.status === "pending-signature" &&
						file.digitalSignatureEnvelopeId,
				)
				.map((file) => String(file.digitalSignatureEnvelopeId)),
		),
	];

	const envelopes =
		envelopeIds.length > 0 ? await getEnvelopesByIds(envelopeIds) : [];
	const byId = new Map(envelopes.map((envelope) => [envelope.$id, envelope]));

	return files.map((file) => {
		if (file.status !== "pending-signature") return file;
		const envelope = file.digitalSignatureEnvelopeId
			? byId.get(file.digitalSignatureEnvelopeId)
			: undefined;
		return {
			...file,
			signatureDisplay: signatureHintFromEnvelope(
				envelope,
				file.digitalSignatureStatus,
			),
		};
	});
}
