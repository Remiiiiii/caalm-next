/**
 * Appwrite table guide for contract templates + guided wizard sessions.
 * Create with alphanumeric $id values, then sync caalm-demo.
 */

export const CONTRACT_TEMPLATES_SCHEMA = {
	name: "contract_templates",
	tableId: "69c8f501001a2b3c4d02",
	attributes: [
		{ key: "orgId", type: "string", size: 64, required: true },
		{ key: "name", type: "string", size: 256, required: true },
		{ key: "description", type: "string", size: 2000, required: false },
		{ key: "contractType", type: "string", size: 64, required: true },
		{
			key: "status",
			type: "string",
			size: 32,
			required: true,
			elements: ["draft", "published", "archived"],
		},
		{ key: "clauseSlots", type: "string", size: 16384, required: true },
		{ key: "createdBy", type: "string", size: 64, required: true },
		{ key: "updatedBy", type: "string", size: 64, required: true },
	],
	indexes: [
		{
			key: "idx_templates_org",
			type: "key",
			attributes: ["orgId"],
			orders: ["ASC"],
		},
		{
			key: "idx_templates_org_status",
			type: "key",
			attributes: ["orgId", "status"],
			orders: ["ASC", "ASC"],
		},
	],
} as const;

export const CONTRACT_WIZARD_SESSIONS_SCHEMA = {
	name: "contract_wizard_sessions",
	tableId: "69c8f502002b3c4d5e03",
	attributes: [
		{ key: "orgId", type: "string", size: 64, required: true },
		{ key: "userId", type: "string", size: 64, required: true },
		{
			key: "status",
			type: "string",
			size: 32,
			required: true,
			elements: ["in_progress", "submitted", "abandoned"],
		},
		{ key: "currentStep", type: "integer", required: true },
		{ key: "payload", type: "string", size: 16384, required: true },
		{ key: "templateId", type: "string", size: 64, required: false },
		{ key: "contractId", type: "string", size: 64, required: false },
	],
	indexes: [
		{
			key: "idx_wizard_org_user",
			type: "key",
			attributes: ["orgId", "userId"],
			orders: ["ASC", "ASC"],
		},
		{
			key: "idx_wizard_status",
			type: "key",
			attributes: ["orgId", "status"],
			orders: ["ASC", "ASC"],
		},
	],
} as const;
