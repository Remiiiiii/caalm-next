/**
 * Job-shaped role templates for the admin role creator.
 * Admins start from a template instead of a blank 70+ permission wall.
 */

import { PERMISSIONS } from "@/constants/permissions";

export type RoleTemplateId =
	| "blank"
	| "viewer"
	| "contract_reviewer"
	| "department_manager"
	| "content_creator"
	| "it_operator";

export type RoleTemplate = {
	id: RoleTemplateId;
	name: string;
	description: string;
	permissionKeys: string[];
};

export const ROLE_TEMPLATES: RoleTemplate[] = [
	{
		id: "blank",
		name: "Blank role",
		description: "Start with no permissions and add only what you need.",
		permissionKeys: [],
	},
	{
		id: "viewer",
		name: "Viewer",
		description: "Read-only oversight for calendars, contracts, and licenses.",
		permissionKeys: [
			PERMISSIONS.CALENDAR.VIEW_OWN,
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.CONTRACTS.VIEW_OWN,
			PERMISSIONS.LICENSES.VIEW,
			PERMISSIONS.LICENSES.VIEW_OWN,
			PERMISSIONS.NEWS.READ,
			PERMISSIONS.AI.CHAT,
		],
	},
	{
		id: "contract_reviewer",
		name: "Contract reviewer",
		description: "Review contracts without final approve or sign powers.",
		permissionKeys: [
			PERMISSIONS.CALENDAR.VIEW_TEAM,
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.CONTRACTS.VIEW_DEPARTMENT,
			PERMISSIONS.CONTRACTS.REVIEW,
			PERMISSIONS.LICENSES.VIEW,
			PERMISSIONS.LICENSES.VIEW_DEPARTMENT,
		],
	},
	{
		id: "department_manager",
		name: "Department manager",
		description: "Team calendar, contract review/approve, and user invite.",
		permissionKeys: [
			PERMISSIONS.CALENDAR.VIEW_TEAM,
			PERMISSIONS.CALENDAR.EDIT_ALL,
			PERMISSIONS.EVENTS.APPROVE,
			PERMISSIONS.EVENTS.RESCHEDULE,
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.CONTRACTS.VIEW_DEPARTMENT,
			PERMISSIONS.CONTRACTS.REVIEW,
			PERMISSIONS.CONTRACTS.APPROVE,
			PERMISSIONS.LICENSES.VIEW,
			PERMISSIONS.LICENSES.VIEW_DEPARTMENT,
			PERMISSIONS.USERS.VIEW,
			PERMISSIONS.USERS.INVITE,
		],
	},
	{
		id: "content_creator",
		name: "Content creator",
		description: "Create and publish internal news without billing or user admin.",
		permissionKeys: [
			PERMISSIONS.NEWS.READ,
			PERMISSIONS.NEWS.CREATE,
			PERMISSIONS.NEWS.UPDATE,
			PERMISSIONS.NEWS.PUBLISH,
			PERMISSIONS.AI.CHAT,
			PERMISSIONS.AI.IMAGE_GENERATE,
			PERMISSIONS.CALENDAR.VIEW_OWN,
		],
	},
	{
		id: "it_operator",
		name: "IT operator",
		description: "Monitoring, runbooks, and incidents — not contract approve.",
		permissionKeys: [
			...Object.values(PERMISSIONS.IT),
			PERMISSIONS.AUDIT.VIEW,
			PERMISSIONS.CALENDAR.VIEW_OWN,
		],
	},
];

export function getRoleTemplate(id: RoleTemplateId): RoleTemplate | undefined {
	return ROLE_TEMPLATES.find((t) => t.id === id);
}
