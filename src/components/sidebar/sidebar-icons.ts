/** Shared icon maps and colors for expanded + collapsed sidebar. */

export const SUBITEM_TEXT_GREY = "#8E8E8E";
/** Fill used by sidebar SVG icons (Uploads, Images, etc.) */
export const NAV_ICON_FILL_GREY = "#BFBFBF";

export const SECTION_ICONS: Record<
	string,
	{ src: string; width: number; height: number }
> = {
	Calendar: { src: "/assets/icons/calendar2.svg", width: 22, height: 22 },
	Contracts: { src: "/assets/icons/contracts.svg", width: 22, height: 22 },
	Licenses: { src: "/assets/icons/license.svg", width: 22, height: 22 },
	Files: { src: "/assets/icons/folder-section.svg", width: 22, height: 22 },
	Audits: { src: "/assets/icons/audit.svg", width: 22, height: 22 },
	Team: { src: "/assets/icons/team.svg", width: 22, height: 22 },
	"Reports & Analytics": {
		src: "/assets/icons/reports-analytics.svg",
		width: 22,
		height: 22,
	},
	Settings: { src: "/assets/icons/settings.svg", width: 22, height: 22 },
	"My Roles & Permissions": {
		src: "/assets/icons/shield.svg",
		width: 22,
		height: 22,
	},
};

export const ITEM_ICONS: Record<
	string,
	{ src?: string; width: number; height: number; color: string }
> = {
	"All Contracts": {
		src: "/assets/icons/all-contracts.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"My Contracts": {
		src: "/assets/icons/my-contracts.svg",
		width: 20,
		height: 18,
		color: SUBITEM_TEXT_GREY,
	},
	"Advanced Resources": {
		src: "/assets/icons/resources.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Proposals & Approvals": {
		src: "/assets/icons/proposal-approval.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Clause Library": {
		src: "/assets/icons/documents.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Contract Templates": {
		src: "/assets/icons/edit.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Funding & Retention": {
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"All Licenses": {
		src: "/assets/icons/licenses.svg",
		width: 25,
		height: 25,
		color: SUBITEM_TEXT_GREY,
	},
	"Department Licenses": {
		src: "/assets/icons/dept-license.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	Uploads: {
		src: "/assets/icons/uploads.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	Documents: {
		width: 22,
		height: 22,
		color: SUBITEM_TEXT_GREY,
	},
	Images: {
		src: "/assets/icons/images.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	Media: {
		src: "/assets/icons/media.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	Others: {
		src: "/assets/icons/others.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Audit Readiness": {
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Compliance Status": {
		src: "/assets/icons/compliance-status.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Audit Logs": {
		src: "/assets/icons/audit-logs.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"User Management": {
		src: "/assets/icons/user-management.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Role Management": {
		src: "/assets/icons/user-management2.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Calendar View": {
		src: "/assets/icons/calendar3.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Training & Certifications": {
		src: "/assets/icons/training-cert.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Assign Tasks": {
		src: "/assets/icons/task.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Report issue": {
		src: "/assets/icons/info.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	Tickets: {
		src: "/assets/icons/file-document.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	Overview: {
		src: "/assets/icons/analytics.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Quick View": {
		src: "/assets/icons/analytics.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"C Suite": {
		src: "/assets/icons/analytics.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"C-Suite": {
		src: "/assets/icons/analytics.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"System Settings": {
		src: "/assets/icons/settings2.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Organization Settings": {
		src: "/assets/icons/settings2.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"Billing & Integrations": {
		src: "/assets/icons/settings2.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	"View My Access": {
		src: "/assets/icons/key.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
	Logs: {
		src: "/assets/icons/audit-logs.svg",
		width: 20,
		height: 20,
		color: SUBITEM_TEXT_GREY,
	},
};

export const DASHBOARD_ITEM_COLORS: Record<string, string> = {
	"Super Admin": SUBITEM_TEXT_GREY,
	"Organization Admin": "#3b82f6",
	"Department Manager": SUBITEM_TEXT_GREY,
	Viewer: SUBITEM_TEXT_GREY,
	IT: "#0f5384",
	"Content Creator": SUBITEM_TEXT_GREY,
};

export function isNavItemActive(
	pathname: string | null,
	url: string,
	rootException?: string,
): boolean {
	if (!pathname || !url) return false;
	if (pathname === url) return true;
	if (rootException && url === rootException) return false;
	return pathname.startsWith(`${url}/`);
}

export function isSectionActive(
	pathname: string | null,
	urls: string[],
	rootException?: string,
): boolean {
	return urls.some((url) => isNavItemActive(pathname, url, rootException));
}
