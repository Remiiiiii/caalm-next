import type { UserDivision } from "../../../../constants";

export const DEMO_SEED_VERSION = 2;
export const MIN_TEAM_USERS = 6;

export const DEMO_ROLE_IDS = {
	orgAdmin: "role_org_admin",
	deptManager: "role_dept_manager",
	viewer: "role_viewer",
	contentCreator: "role_content_creator",
	itStaff: "role_it_staff",
} as const;

export type DemoPersona = {
	slug: string;
	fullName: string;
	email: string;
	roleId: string;
	department:
		| "IT"
		| "Finance"
		| "Legal"
		| "Operations"
		| "Sales"
		| "Marketing"
		| "Executive"
		| "Engineering"
		| "Administration";
	division: UserDivision;
};

/** Fictional teammates for User Management / analytics (not Auth accounts). */
export const DEMO_TEAM_PERSONAS: DemoPersona[] = [
	{
		slug: "alex-rivera",
		fullName: "Alex Rivera",
		email: "demo+alex-rivera@caalm.demo",
		roleId: DEMO_ROLE_IDS.deptManager,
		department: "Operations",
		division: "behavioral-health",
	},
	{
		slug: "jordan-lee",
		fullName: "Jordan Lee",
		email: "demo+jordan-lee@caalm.demo",
		roleId: DEMO_ROLE_IDS.deptManager,
		department: "Operations",
		division: "clinic",
	},
	{
		slug: "sam-ortiz",
		fullName: "Sam Ortiz",
		email: "demo+sam-ortiz@caalm.demo",
		roleId: DEMO_ROLE_IDS.viewer,
		department: "Administration",
		division: "hr",
	},
	{
		slug: "riley-chen",
		fullName: "Riley Chen",
		email: "demo+riley-chen@caalm.demo",
		roleId: DEMO_ROLE_IDS.contentCreator,
		department: "Administration",
		division: "hr",
	},
	{
		slug: "morgan-patel",
		fullName: "Morgan Patel",
		email: "demo+morgan-patel@caalm.demo",
		roleId: DEMO_ROLE_IDS.deptManager,
		department: "IT",
		division: "support",
	},
	{
		slug: "casey-nguyen",
		fullName: "Casey Nguyen",
		email: "demo+casey-nguyen@caalm.demo",
		roleId: DEMO_ROLE_IDS.viewer,
		department: "Finance",
		division: "accounting",
	},
];

/** Deterministic row id helper (Appwrite IDs: a-z A-Z 0-9 _, max 36). */
export function demoRowId(orgId: string, suffix: string): string {
	const compact = orgId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
	const id = `d${compact}${suffix}`.slice(0, 36);
	return id;
}
