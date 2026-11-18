import type { ScriptSection } from "@/lib/audit-lab/script-sections";
import { SCRIPT_SECTIONS } from "@/lib/audit-lab/script-sections";
import type { ReviewSession, SessionStatus } from "@/lib/audit-lab/types";

/** UI labels for the Simulation Detail sheet vertical stepper. */
export const SIMULATION_PHASE_LABELS: Record<ScriptSection, string> = {
	opening: "Opening",
	process: "Walkthrough",
	evidence: "Evidence",
	closing: "Closing",
};

export const SIMULATION_PHASES = SCRIPT_SECTIONS;

type AuditTrailShape = {
	currentPhase?: string;
	[key: string]: unknown;
};

function parseAuditTrail(json: string | undefined): AuditTrailShape {
	if (!json?.trim()) return {};
	try {
		const parsed = JSON.parse(json) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return {};
		}
		return parsed as AuditTrailShape;
	} catch {
		return {};
	}
}

export function isSimulationPhase(value: unknown): value is ScriptSection {
	return (
		typeof value === "string" &&
		(SCRIPT_SECTIONS as readonly string[]).includes(value)
	);
}

/** Fallback when no phase is stored yet — maps lifecycle status to a phase. */
export function phaseFromSessionStatus(status: SessionStatus): ScriptSection {
	switch (status) {
		case "in_progress":
			return "process";
		case "completed":
		case "report_ready":
		case "archived":
			return "closing";
		case "draft":
		case "scheduled":
		case "prep":
		case "cancelled":
			return "opening";
		default: {
			const _exhaustive: never = status;
			void _exhaustive;
			return "opening";
		}
	}
}

/**
 * Single source of truth for "what phase is this simulation in."
 * Stored on `auditTrailJson.currentPhase` until a dedicated column lands.
 */
export function resolveSimulationPhase(session: ReviewSession): ScriptSection {
	const trail = parseAuditTrail(session.auditTrailJson);
	if (isSimulationPhase(trail.currentPhase)) return trail.currentPhase;
	return phaseFromSessionStatus(session.status);
}

export function writeSimulationPhaseToTrail(
	existingJson: string | undefined,
	phase: ScriptSection,
): string {
	const trail = parseAuditTrail(existingJson);
	return JSON.stringify({ ...trail, currentPhase: phase });
}

export function phaseIndex(phase: ScriptSection): number {
	return SIMULATION_PHASES.indexOf(phase);
}
