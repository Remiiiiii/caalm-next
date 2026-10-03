/** Public give-page program options when org has no CRM designations configured. */

export type GiveProgramOption = {
	value: string;
	label: string;
	/** True when value is a persisted designation id (not a synthetic prog: key). */
	fromOrg?: boolean;
};

/** Inspired by community nonprofit service areas (e.g. child welfare, health, youth). */
export const DEFAULT_GIVE_PROGRAMS: GiveProgramOption[] = [
	{ value: "__general__", label: "Where it's needed most" },
	{ value: "prog:child-family", label: "Child & family services" },
	{ value: "prog:behavioral-health", label: "Behavioral health" },
	{ value: "prog:pediatrics-medical", label: "Pediatrics & medical care" },
	{ value: "prog:youth-foster", label: "Youth intervention & foster care" },
	{ value: "prog:nutrition-community", label: "Nutrition & community programs" },
];

export function buildGiveProgramOptions(
	orgDesignations: { id: string; label: string }[],
): GiveProgramOption[] {
	const seen = new Set<string>();
	const options: GiveProgramOption[] = [];

	const add = (opt: GiveProgramOption) => {
		const key = opt.label.trim().toLowerCase();
		if (seen.has(key)) return;
		seen.add(key);
		options.push(opt);
	};

	add({ value: "__general__", label: "Where it's needed most" });

	for (const d of orgDesignations) {
		add({ value: d.id, label: d.label, fromOrg: true });
	}

	for (const d of DEFAULT_GIVE_PROGRAMS) {
		if (d.value === "__general__") continue;
		add(d);
	}

	return options;
}

export function resolveGiveProgramLabel(
	options: GiveProgramOption[],
	selectedValue: string,
): string {
	return (
		options.find((o) => o.value === selectedValue)?.label ??
		"Where it's needed most"
	);
}

/** Maps gift amount to a concrete impact line for the left column. */
export function giveImpactStatement(amountDollars: number): string {
	const amount = Number.isFinite(amountDollars) && amountDollars > 0 ? amountDollars : 25;
	if (amount < 50) {
		return "provides a full week of after-school tutoring materials for one student in our literacy program.";
	}
	if (amount < 100) {
		return "covers a month of behavioral health group sessions for a child in crisis.";
	}
	if (amount < 250) {
		return "helps fund medical intake and care navigation for a family without insurance.";
	}
	return "supports wraparound child welfare case management for a vulnerable household.";
}

export function isPersistedDesignationId(
	selectedValue: string,
	options: GiveProgramOption[],
): string | undefined {
	if (selectedValue === "__general__" || selectedValue.startsWith("prog:")) {
		return undefined;
	}
	const match = options.find((o) => o.value === selectedValue && o.fromOrg);
	return match ? selectedValue : undefined;
}
