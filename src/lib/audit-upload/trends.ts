import { listAuditDocuments, listCaps, listFindings } from "./store";

export async function buildAuditTrends(orgId: string) {
	const documents = await listAuditDocuments(orgId, 50);
	const complete = documents.filter((doc) => doc.status === "complete");
	if (complete.length < 2) {
		return {
			ready: false,
			message: "Trends appear after two completed audit uploads.",
			documentCount: complete.length,
		};
	}

	const findings = (
		await Promise.all(
			complete.map((doc) => listFindings({ orgId, documentId: doc.$id, limit: 200 })),
		)
	).flat();
	const caps = (
		await Promise.all(
			complete.map((doc) => listCaps({ orgId, documentId: doc.$id, limit: 200 })),
		)
	).flat();

	const closedCaps = caps.filter((cap) => cap.closedAt && cap.$createdAt);
	const mttrHours =
		closedCaps.length === 0
			? null
			: closedCaps.reduce((sum, cap) => {
					const start = new Date(cap.$createdAt as string).getTime();
					const end = new Date(cap.closedAt as string).getTime();
					return sum + (end - start) / 36e5;
				}, 0) / closedCaps.length;

	const now = Date.now();
	const dueCaps = caps.filter((cap) => cap.dueAt);
	const onTime = dueCaps.filter((cap) => {
		if (!cap.closedAt) return new Date(cap.dueAt).getTime() >= now;
		return new Date(cap.closedAt).getTime() <= new Date(cap.dueAt).getTime();
	}).length;

	return {
		ready: true,
		documentCount: complete.length,
		findingCount: findings.length,
		repeatRate:
			findings.length === 0
				? 0
				: findings.filter((finding) => finding.isRepeat).length / findings.length,
		auditorErrorRate:
			findings.length === 0
				? 0
				: findings.filter((finding) => finding.status === "disputed").length /
					findings.length,
		slaOnTimeRate: dueCaps.length === 0 ? null : onTime / dueCaps.length,
		mttrHours,
	};
}
