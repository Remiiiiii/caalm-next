import {
	BadgeDollarSign,
	CalendarClock,
	ClipboardCheck,
	FileSignature,
	FileSpreadsheet,
	HandHeart,
	Landmark,
	LockKeyhole,
	QrCode,
	ScrollText,
	ShieldCheck,
	Sparkles,
	UserPlus,
	Users,
} from "lucide-react";

export const NONPROFIT_JUMP_LINKS = [
	{ href: "#journey", label: "Donor journey" },
	{ href: "#supporters", label: "Supporters" },
	{ href: "#giving", label: "Giving & events" },
	{ href: "#funds", label: "Restricted funds" },
	{ href: "#volunteers", label: "Volunteers" },
	{ href: "#reporting", label: "Board reporting" },
	{ href: "#scope", label: "Scope & privacy" },
] as const;

export const DONOR_JOURNEY_STEPS = [
	{
		title: "Registers for your gala",
		detail: "Picks a ticket type and adds a gift at checkout.",
		icon: QrCode,
	},
	{
		title: "Checks in at the door",
		detail: "A signed QR scan creates their constituent record.",
		icon: UserPlus,
	},
	{
		title: "Gift posts to a fund",
		detail: "The designation maps to the right fund code.",
		icon: BadgeDollarSign,
	},
	{
		title: "Receipt goes out once",
		detail: "Sent automatically, never twice, and only with consent.",
		icon: ScrollText,
	},
	{
		title: "Thank-you lands on your queue",
		detail: "A task appears for the right staff member.",
		icon: HandHeart,
	},
	{
		title: "Renewal ask at the right time",
		detail: "Lapse risk rises, so the next best action changes.",
		icon: Sparkles,
	},
] as const;

export const NONPROFIT_PILLARS = [
	{
		id: "supporters",
		eyebrow: "Constituent CRM & stewardship",
		title: "Know every supporter, and what to do next",
		description:
			"One profile per person or household, with every gift, event, and conversation on a single timeline.",
		bullets: [
			"Households, relationships, and soft credits",
			"Duplicate detection and a guided merge wizard",
			"Explainable lapse-risk and upgrade-readiness scores",
			"Suggested ask amounts from giving history",
			"Next best actions you can dismiss with a cooldown",
			"Do-not-contact rules enforced on every send",
		],
		icon: Users,
	},
	{
		id: "giving",
		eyebrow: "Gifts, campaigns & events",
		title: "Raise money online, at the door, and on schedule",
		description:
			"Every gift gets a receipt number, a campaign, and a fund. Posted gifts stay locked so your books match.",
		bullets: [
			"Public give page with Stripe Checkout",
			"Recurring gifts and pledge installments with reminders",
			"Ticket types, capacity limits, and QR check-in",
			"Donations at registration roll into the event campaign",
			"Gifts linked to the grant contracts they fund",
			"CSV import with a dry run before anything commits",
		],
		icon: BadgeDollarSign,
	},
	{
		id: "funds",
		eyebrow: "Restricted-fund finance",
		title: "Spend restricted money the way donors intended",
		description:
			"Every grant contract points to a fund, so budget versus actual stays current as gifts and obligations post.",
		bullets: [
			"Funds grouped by net-asset class",
			"Grant budget lines with budget versus actual",
			"Restriction release events you can trace",
			"Form 990 Part IX worksheet CSV for your preparer",
			"Journal export in CSV or IIF for your accounting system",
			"Grants missing a fund get flagged automatically",
		],
		icon: Landmark,
	},
	{
		id: "volunteers",
		eyebrow: "Volunteer programs",
		title: "Fill shifts and prove every volunteer hour",
		description:
			"Shifts live on the same calendar as your contract deadlines, and hours roll up to the programs your grants fund.",
		bullets: [
			"Shift templates with capacity and a waitlist",
			"Hour logs with coordinator approval",
			"Coordinators can log hours on a volunteer's behalf",
			"Waivers signed with the same e-signature flow as contracts",
			"Hours tagged to a grant program",
			"Hour letters ready to export",
		],
		icon: CalendarClock,
	},
] as const;

export type NonprofitPillarId = (typeof NONPROFIT_PILLARS)[number]["id"];

export const BOARD_REPORT_ITEMS = [
	{
		title: "Development dashboard",
		detail: "Year-to-date dollars, donor count, retention, and new donors.",
	},
	{
		title: "Campaign ROI",
		detail: "Add campaign cost and see what each dollar raised.",
	},
	{
		title: "Funder snapshot",
		detail: "One PDF or CSV per funder with gifts, grants, and spend.",
	},
	{
		title: "Board pack",
		detail: "Export the KPIs your board reviews every quarter.",
	},
] as const;

export const PLATFORM_TIE_INS = [
	{
		title: "Grants are contracts",
		detail:
			"Grant agreements run through the same drafting, approval, and renewal alerts as every other contract.",
		icon: FileSignature,
	},
	{
		title: "One permission model",
		detail:
			"Fundraising, finance, and volunteer screens follow the roles you already assign.",
		icon: ShieldCheck,
	},
	{
		title: "One audit trail",
		detail:
			"Imports, exports, and profile views with personal data are logged.",
		icon: ClipboardCheck,
	},
] as const;

export const SCOPE_BOUNDARIES = [
	{
		label: "Payroll",
		note: "Not payroll. Keep your payroll provider.",
	},
	{
		label: "General ledger",
		note: "Not a general ledger. Send journal exports to yours.",
	},
	{
		label: "Tax filing",
		note: "No 990 e-file. Hand the worksheet to your preparer.",
	},
] as const;

export const PRIVACY_POINTS = [
	{
		title: "Channel consent",
		detail:
			"Receipts and appeals respect each supporter's email and mail choices.",
		icon: LockKeyhole,
	},
	{
		title: "Preference center",
		detail: "Supporters update their own choices from a secure link.",
		icon: UserPlus,
	},
	{
		title: "Export and delete",
		detail: "Constituents are included in tenant export and tenant delete.",
		icon: FileSpreadsheet,
	},
] as const;
