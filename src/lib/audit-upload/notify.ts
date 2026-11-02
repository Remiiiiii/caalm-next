import { createNotification } from "@/lib/actions/notification.actions";

export async function notifyAuditAnalysisComplete(input: {
	orgId: string;
	documentId: string;
	userId: string;
	fileName: string;
	findingCount: number;
}): Promise<void> {
	try {
		await createNotification({
			userId: input.userId,
			title: "Audit analysis complete",
			message: `${input.fileName} produced ${input.findingCount} finding(s). Review them before they become official.`,
			type: "info",
			actionUrl: `/audits/upload/${input.documentId}`,
			actionText: "Review findings",
			triggerType: "automatic",
		});
	} catch (error) {
		console.warn("[SERVER] notifyAuditAnalysisComplete:", error);
	}
}

export async function notifyCapEscalation(input: {
	userId: string;
	capId: string;
	title: string;
	tier: number;
}): Promise<void> {
	try {
		await createNotification({
			userId: input.userId,
			title: `Corrective action escalated (tier ${input.tier})`,
			message: input.title,
			type: "warning",
			actionUrl: `/audits/uploads`,
			actionText: "Open CAP",
			triggerType: "automatic",
			priority: "high",
		});
	} catch (error) {
		console.warn("[SERVER] notifyCapEscalation:", error);
	}
}
