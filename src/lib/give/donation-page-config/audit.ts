import type { AuditChangeDiff } from "@/lib/audits/audit-log.utils";
import type { DonationPageConfigActor } from "./types";

export type DonationPageConfigAuditSink = (input: {
	action: "publish" | "revert";
	orgId: string;
	actor: DonationPageConfigActor;
	versionBefore: number | null;
	versionAfter: number;
	changeSummary?: string;
	changes?: AuditChangeDiff[];
}) => Promise<void>;

export async function defaultDonationPageConfigAuditSink(input: {
	action: "publish" | "revert";
	orgId: string;
	actor: DonationPageConfigActor;
	versionBefore: number | null;
	versionAfter: number;
	changeSummary?: string;
	changes?: AuditChangeDiff[];
}): Promise<void> {
	const title =
		input.action === "publish"
			? "Donation page config published"
			: "Donation page config reverted";

	const { logAuditEvent } = await import("@/lib/services/audit-logger");
	await logAuditEvent({
		event_id: `donation-page-config-${input.action}-${input.orgId}-${input.versionAfter}`,
		event_title: title,
		action: "update",
		source: "caalm",
		user_id: input.actor.userId,
		user_name: input.actor.userName,
		user_email: input.actor.userEmail,
		orgId: input.orgId,
		status: "success",
		module: "billing",
		target_type: "donation_page_config",
		target_id: input.orgId,
		target_label: "Donation page settings",
		summary:
			input.changeSummary ??
			`${title} (v${input.versionBefore ?? "—"} → v${input.versionAfter})`,
		changes: input.changes,
		metadata: {
			donationPageConfigAction: input.action,
			versionBefore: input.versionBefore,
			versionAfter: input.versionAfter,
		},
	});
}

/** Collects audit entries in tests without touching Appwrite. */
export function createInMemoryDonationPageConfigAuditSink(): DonationPageConfigAuditSink & {
	entries: Array<Parameters<DonationPageConfigAuditSink>[0]>;
} {
	const entries: Array<Parameters<DonationPageConfigAuditSink>[0]> = [];
	const sink: DonationPageConfigAuditSink = async (input) => {
		entries.push(input);
	};
	return Object.assign(sink, { entries });
}
