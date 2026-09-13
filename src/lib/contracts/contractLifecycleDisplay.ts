import type {
	ApprovalStepKind,
	ApprovalWorkflowState,
} from "@/lib/approvals/contractApprovalWorkflow.types";
import { isContractExpired } from "@/lib/contracts/contractsListUtils";
import type { UIFileDoc } from "@/types/files";

const DECISION_STEP_KINDS = new Set<ApprovalStepKind>([
	"department_review",
	"internal_approval",
	"executive_approval",
	"awaiting_executive",
]);

const STUCK_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

const STATUS_CLASSES: Record<string, string> = {
	active: "bg-green/10 text-green border-green/20",
	"pending-review": "bg-orange/10 text-orange border-orange/20",
	"pending-signature": "bg-blue/10 text-blue border-blue/20",
	"pending-countersign": "bg-blue/10 text-blue border-blue/20",
	"action-required": "bg-red/10 text-red border-red/20",
	inactive: "bg-slate-100 text-slate-600 border-slate-200",
	expired: "bg-red/10 text-red border-red/20",
	negotiation: "bg-orange/10 text-orange border-orange/20",
	draft: "bg-slate-100 text-slate-600 border-slate-200",
};

const CLICKABLE_KEYS = new Set([
	"pending-review",
	"action-required",
	"pending-signature",
	"pending-countersign",
	"active",
	"inactive",
	"expired",
]);

export type SignatureDisplayStage = "not_sent" | "sent" | "countersign";

export interface SignatureDisplayHint {
	stage: SignatureDisplayStage;
	signedCount?: number;
	totalSigners?: number;
}

export interface ContractLifecycleDisplay {
	key: string;
	label: string;
	className: string;
	subtext?: string;
	stuck: boolean;
	clickable: boolean;
}

type EnvelopeLike = {
	status?: string;
	recipients?: Array<{ role?: string; status?: string }>;
};

type LifecycleInput = Pick<
	UIFileDoc,
	| "status"
	| "lifecycleStatus"
	| "approvalWorkflowState"
	| "digitalSignatureStatus"
	| "signatureDisplay"
	| "$updatedAt"
	| "isExpired"
	| "contractExpiryDate"
>;

export function parseWorkflowStateJson(
	raw: string | ApprovalWorkflowState | null | undefined,
): ApprovalWorkflowState | null {
	if (!raw) return null;
	if (typeof raw === "object") {
		if (!raw.steps || !Array.isArray(raw.steps)) return null;
		return raw;
	}
	try {
		const parsed = JSON.parse(raw) as ApprovalWorkflowState;
		if (!parsed?.steps || !Array.isArray(parsed.steps)) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function signatureHintFromEnvelope(
	envelope: EnvelopeLike | null | undefined,
	digitalSignatureStatus?: string | null,
): SignatureDisplayHint {
	const signers = (envelope?.recipients || []).filter(
		(r) => (r.role || "signer") === "signer",
	);
	const signedCount = signers.filter((r) => r.status === "signed").length;
	const totalSigners = signers.length;
	const envelopeStatus = (envelope?.status || "").toLowerCase();
	const sigStatus = (digitalSignatureStatus || "").toLowerCase();

	if (
		envelopeStatus === "partially_signed" ||
		(totalSigners > 1 && signedCount > 0 && signedCount < totalSigners)
	) {
		return { stage: "countersign", signedCount, totalSigners };
	}

	const sentLike =
		envelopeStatus === "sent" ||
		envelopeStatus === "viewed" ||
		sigStatus === "pending";

	if (sentLike && envelopeStatus !== "draft") {
		return { stage: "sent", signedCount, totalSigners };
	}

	return { stage: "not_sent", signedCount, totalSigners };
}

function progressSubtext(
	state: ApprovalWorkflowState | null,
): string | undefined {
	if (!state) return undefined;
	const decisionSteps = state.steps.filter((step) =>
		DECISION_STEP_KINDS.has(step.kind),
	);
	if (decisionSteps.length === 0) return undefined;
	const approved = decisionSteps.filter(
		(step) => step.status === "complete",
	).length;
	return `${approved} of ${decisionSteps.length} approved`;
}

function isStuck(
	file: LifecycleInput,
	state: ApprovalWorkflowState | null,
	now: Date,
): boolean {
	const operational = file.status;
	if (operational !== "pending-review" && operational !== "action-required") {
		return false;
	}
	const current = state?.steps[state.currentStepIndex];
	if (current?.slaStatus === "at_risk" || current?.slaStatus === "breached") {
		return true;
	}
	const startedAt = current?.startedAt || file.$updatedAt;
	if (!startedAt) return false;
	const started = new Date(startedAt);
	if (Number.isNaN(started.getTime())) return false;
	return now.getTime() - started.getTime() >= STUCK_AFTER_MS;
}

export function getContractLifecycleDisplay(
	file: LifecycleInput,
	options?: { now?: Date },
): ContractLifecycleDisplay {
	const now = options?.now ?? new Date();
	const lifecycle = (file.lifecycleStatus || "").toLowerCase();
	const expired = isContractExpired(file as UIFileDoc);

	let key = "";
	if (expired) {
		key = "expired";
	} else if (lifecycle === "negotiation") {
		key = "negotiation";
	} else if (lifecycle === "draft" && !file.status) {
		key = "draft";
	} else {
		key = file.status || "";
	}

	const state = parseWorkflowStateJson(file.approvalWorkflowState);
	const hint =
		file.signatureDisplay ||
		(key === "pending-signature"
			? signatureHintFromEnvelope(null, file.digitalSignatureStatus)
			: undefined);

	let label =
		{
			"pending-review": "Pending Review",
			"action-required": "Action Required",
			"pending-signature": "Pending Signature",
			active: "Active",
			inactive: "Inactive",
			expired: "Expired",
			negotiation: "Negotiation",
			draft: "Draft",
		}[key] ||
		key ||
		"—";

	let subtext: string | undefined;
	if (key === "pending-review" || key === "action-required") {
		subtext = progressSubtext(state);
	}

	if (key === "pending-signature") {
		if (hint?.stage === "countersign") {
			key = "pending-countersign";
			label = "Pending Countersign";
			subtext =
				hint.signedCount != null && hint.totalSigners
					? `${hint.signedCount} of ${hint.totalSigners} signed`
					: "Awaiting next signer";
		} else if (hint?.stage === "sent") {
			subtext = "Sent to signer";
		} else {
			subtext = "Not sent";
		}
	}

	return {
		key,
		label,
		className:
			STATUS_CLASSES[key] || "bg-slate-100 text-slate-700 border-slate-200",
		subtext,
		stuck: isStuck(file, state, now),
		clickable: CLICKABLE_KEYS.has(key),
	};
}
