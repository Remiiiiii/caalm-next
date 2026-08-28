/** Alphanumeric Appwrite table IDs (name lives on the table, not the $id). */
export const TEMPLATE_TABLE_IDS = {
	templates: "69c8f501001a2b3c4d02",
	wizardSessions: "69c8f502002b3c4d5e03",
} as const;

export const TEMPLATE_TABLE_NAMES = {
	templates: "contract_templates",
	wizardSessions: "contract_wizard_sessions",
} as const;

export const WIZARD_STEPS = [
	{ id: 0, title: "Start", hint: "Blank document or a published recipe" },
	{ id: 1, title: "Details", hint: "Parties, dates, and value" },
	{ id: 2, title: "Assemble", hint: "Clauses plus any extra templates" },
	{ id: 3, title: "Preview", hint: "Read the snapshot, then send for review" },
] as const;

export const WIZARD_STEP_COUNT = WIZARD_STEPS.length;

export const EMPTY_INTAKE = {
	contractName: "",
	contractType: "vendor",
	department: "",
	counterparty: "",
	amount: "",
	currency: "USD",
	startDate: "",
	expiryDate: "",
	governingLaw: "",
	description: "",
} as const;
