import {
	Bell,
	Calendar,
	FileCheck,
	FolderLock,
	KeyRound,
	Mail,
	ShieldCheck,
	Upload,
	Users,
} from "lucide-react";

export const HOW_IT_WORKS_STEPS = [
	{
		step: 1,
		title: "Sign up & organize",
		description:
			"Create your organization and import contracts, licenses, and audit records into one secure workspace.",
		icon: Upload,
	},
	{
		step: 2,
		title: "Assign ownership",
		description:
			"Map documents to department managers with permission-based access so the right people stay accountable.",
		icon: Users,
	},
	{
		step: 3,
		title: "Automate alerts",
		description:
			"Get proactive notifications for renewals, audits, and compliance milestones before deadlines slip.",
		icon: Bell,
	},
	{
		step: 4,
		title: "Report & audit",
		description:
			"Track status on live dashboards, run approvals, and export compliance reports when auditors ask.",
		icon: FileCheck,
	},
] as const;

export const SPOTLIGHT_TABS = [
	{
		id: "contracts",
		label: "Contracts",
		searchPlaceholder: "Search contracts…",
		kpis: [
			{ label: "Active contracts", value: 156, suffix: "" },
			{ label: "Pending approvals", value: 12, suffix: "" },
			{ label: "Renewals (30d)", value: 8, suffix: "" },
		],
		stats: [
			{ label: "Service agreements", value: 64 },
			{ label: "Vendor contracts", value: 48 },
			{ label: "Partnerships", value: 28 },
			{ label: "Consulting", value: 16 },
		],
	},
	{
		id: "licenses",
		label: "Licenses",
		searchPlaceholder: "Search licenses…",
		kpis: [
			{ label: "Active licenses", value: 89, suffix: "" },
			{ label: "Expiring soon", value: 6, suffix: "" },
			{ label: "Compliance rate", value: 94, suffix: "%" },
		],
		stats: [
			{ label: "Professional", value: 32 },
			{ label: "Facility", value: 21 },
			{ label: "Software", value: 24 },
			{ label: "Certifications", value: 12 },
		],
	},
	{
		id: "audits",
		label: "Audits",
		searchPlaceholder: "Search audits…",
		kpis: [
			{ label: "Open audits", value: 14, suffix: "" },
			{ label: "Completed YTD", value: 41, suffix: "" },
			{ label: "Findings closed", value: 92, suffix: "%" },
		],
		stats: [
			{ label: "Internal", value: 18 },
			{ label: "External", value: 9 },
			{ label: "Regulatory", value: 7 },
			{ label: "Follow-ups", value: 11 },
		],
	},
	{
		id: "analytics",
		label: "Analytics",
		searchPlaceholder: "Search analytics…",
		kpis: [
			{ label: "Compliance rate", value: 85, suffix: "%" },
			{ label: "Budget tracked", value: 1.9, suffix: "M", prefix: "$", decimals: 1 },
			{ label: "Staff covered", value: 89, suffix: "" },
		],
		stats: [
			{ label: "On-time renewals", value: 96 },
			{ label: "Alerts sent", value: 312 },
			{ label: "Departments", value: 6 },
			{ label: "Risk flags", value: 4 },
		],
	},
] as const;

export const INTEGRATIONS = [
	{
		title: "Calendar sync",
		description: "Surface renewal and audit dates on the calendars your teams already use.",
		icon: Calendar,
	},
	{
		title: "Email notifications",
		description: "Route deadline alerts to owners and managers with role-aware delivery.",
		icon: Mail,
	},
	{
		title: "Document storage",
		description: "Keep signed files, versions, and evidence linked to every agreement.",
		icon: FolderLock,
	},
	{
		title: "SSO & RBAC",
		description: "Permission-based access so users only see what their roles allow.",
		icon: KeyRound,
	},
] as const;

export const PERFORMANCE_METRICS = [
	{ label: "Contracts managed", value: 12, suffix: "K+", decimals: 0 },
	{ label: "Licenses tracked", value: 4, suffix: "K+", decimals: 0 },
	{ label: "Audits completed", value: 2, suffix: "K+", decimals: 0 },
	{ label: "Renewal alerts sent", value: 48, suffix: "K+", decimals: 0 },
	{ label: "Customer satisfaction", value: 98, suffix: "%", decimals: 0 },
	{ label: "Organizations served", value: 120, suffix: "+", decimals: 0 },
] as const;

export const ABOUT_TRUST_BULLETS = [
	{
		title: "Permission-based access",
		description:
			"Navigation and data access follow permissions assigned in your roles — not hardcoded shortcuts.",
		icon: ShieldCheck,
	},
	{
		title: "Full audit trails",
		description:
			"Track who changed what, when approvals moved, and how compliance status evolved.",
		icon: FileCheck,
	},
	{
		title: "Encrypted storage",
		description:
			"Contracts, licenses, and supporting documents stay encrypted with enterprise-grade controls.",
		icon: FolderLock,
	},
	{
		title: "Department ownership",
		description:
			"Assign accountability by team so renewals and audits never fall through the cracks.",
		icon: Users,
	},
] as const;

export const FAQ_ITEMS = [
	{
		question: "What is Caalm?",
		answer:
			"A contract, license, and audit management system for organizations to track compliance standards and important expiration dates in one place.",
	},
	{
		question: "What core problem does CAALM solve?",
		answer:
			"CAALM centralizes contract, license, and audit management so teams don't miss renewals, stay compliant, and get department-level ownership with automated alerts and executive reporting.",
	},
	{
		question: "How secure is my contract data?",
		answer:
			"Enterprise-grade security with encrypted data, role-based access control, and audit trails so your organization can meet compliance standards.",
	},
	{
		question: "How does permission-based access work?",
		answer:
			"Users inherit permissions through roles stored in the database. Features, navigation, and data access check those permissions — there are no role-based bypasses.",
	},
	{
		question: "Can CAALM integrate with tools we already use?",
		answer:
			"Yes. CAALM supports calendar sync, email notifications, document storage workflows, and SSO/RBAC patterns so it fits into your existing stack.",
	},
	{
		question: "What happens when contracts are about to expire?",
		answer:
			"Automated notifications go to the right people based on their roles and departments so renewals and audits don't get missed.",
	},
] as const;

export const FOOTER_KEYWORDS = [
	"Contract management",
	"License tracking",
	"Audit readiness",
	"Compliance automation",
	"RBAC security",
	"Renewal alerts",
	"Department ownership",
	"Executive reporting",
	"Document centralization",
	"Approval workflows",
] as const;

export const TRUSTED_BRAND_LOGOS = [
	{ src: "/assets/icons/asterisk.svg", alt: "Asterisk" },
	{ src: "/assets/icons/oasis.svg", alt: "Oasis" },
	{ src: "/assets/icons/eooks.svg", alt: "Eooks" },
	{ src: "/assets/icons/opal.svg", alt: "Opal" },
	{ src: "/assets/icons/dune.svg", alt: "Dune" },
] as const;

export const CONTRACT_MOCK_ROWS = [
	{
		name: "Meridian Health Agreement",
		status: "Pending Review",
		statusTone: "pending" as const,
		size: "2.4 MB",
		uploaded: "7 Feb, 6:01pm",
		expires: "15 Jan, 2027",
		department: "Finance",
	},
	{
		name: "Northgate Vendor SOW",
		status: "Active",
		statusTone: "active" as const,
		size: "1.1 MB",
		uploaded: "1 Jan, 2:26pm",
		expires: "2 Jan, 2027",
		department: "Operations",
	},
	{
		name: "BrightPath Consulting MSA",
		status: "Expired",
		statusTone: "expired" as const,
		size: "890 KB",
		uploaded: "12 Dec, 9:14am",
		expires: "2 Jan, 2026",
		department: "Legal",
	},
	{
		name: "Harbor Ridge Facilities Lease",
		status: "Active",
		statusTone: "active" as const,
		size: "3.2 MB",
		uploaded: "18 Nov, 11:02am",
		expires: "30 Jun, 2028",
		department: "Facilities",
	},
] as const;

export const LICENSE_MOCK_ROWS = [
	{
		name: "State Nursing Board License",
		status: "Active",
		statusTone: "active" as const,
		size: "1.8 MB",
		uploaded: "14 Mar, 10:22am",
		expires: "30 Sep, 2026",
		department: "Clinical",
		assignedTo: "A. Rivera",
	},
	{
		name: "Facility Occupancy Permit",
		status: "Expiring Soon",
		statusTone: "pending" as const,
		size: "940 KB",
		uploaded: "2 Jan, 3:15pm",
		expires: "12 Aug, 2026",
		department: "Facilities",
		assignedTo: "J. Chen",
	},
	{
		name: "Adobe Creative Cloud Enterprise",
		status: "Active",
		statusTone: "active" as const,
		size: "210 KB",
		uploaded: "19 Nov, 9:04am",
		expires: "1 Dec, 2026",
		department: "Marketing",
		assignedTo: "M. Okonkwo",
	},
	{
		name: "HIPAA Security Certification",
		status: "Action Required",
		statusTone: "expired" as const,
		size: "2.1 MB",
		uploaded: "8 Oct, 4:41pm",
		expires: "22 Jul, 2026",
		department: "Compliance",
		assignedTo: "S. Patel",
	},
] as const;

export const AUDIT_MOCK_MODULES = [
	{ label: "Regulatory filings", rag: "green" as const, value: "On track" },
	{ label: "Contracts", rag: "amber" as const, value: "Needs attention" },
	{ label: "Licenses", rag: "green" as const, value: "On track" },
	{ label: "Documents", rag: "red" as const, value: "At risk" },
] as const;

export const FEATURE_SPOTLIGHT_TILES = [
	{
		id: "search",
		title: "Ask CAALM anything",
		subtitle: "Search contracts, licenses, or audits…",
	},
	{
		id: "rings",
		title: "Compliance pulse",
		metrics: [
			{ label: "Compliance", value: 100 },
			{ label: "Renewals", value: 96 },
			{ label: "Audits", value: 78 },
		],
	},
	{
		id: "reports",
		title: "Custom reports",
		subtitle: "Export readiness packs in one click",
	},
	{
		id: "integrations",
		title: "Connected partners",
		subtitle: "Calendar, email, storage, SSO",
	},
	{
		id: "ownership",
		title: "Department ownership",
		chips: ["Finance", "Legal", "HR", "Operations"],
	},
	{
		id: "alerts",
		title: "Renewal alerts",
		subtitle: "30 / 60 / 90 day escalations",
		progress: 72,
	},
] as const;

export const TESTIMONIALS = [
	{
		quote:
			"An absolute standout! This platform delivers strong tools, effortless connectivity, and usability.",
		name: "Brendan",
		role: "Owner of Ledgerworks",
		image: "/assets/images/brendan.png",
	},
	{
		quote:
			"A remarkable solution! It provides top-tier features, intuitive interfaces, and reliability.",
		name: "Jasmine",
		role: "Owner of Meridian",
		image: "/assets/images/wilson.png",
	},
	{
		quote:
			"A genuine innovation! Experience advanced tools, smooth workflows, and high utility.",
		name: "Jordan",
		role: "Owner of Ironleaf Analytics",
		image: "/assets/images/mayak.png",
	},
	{
		quote:
			"A revolutionary platform! Packed with cutting-edge tools, integration ease, and functionality.",
		name: "Maya",
		role: "Owner of Horizon Contract Labs",
		image: "/assets/images/jacychan.png",
	},
	{
		quote:
			"A real breakthrough! Unlock next-gen features, smooth compatibility, and efficiency.",
		name: "Sienna",
		role: "Owner of Aurora CivicTech",
		image: "/assets/images/jamesli.png",
	},
	{
		quote:
			"A standout choice! Combining advanced features, smooth syncing, and practicality.",
		name: "Elena",
		role: "Owner of Bluewave",
		image: "/assets/images/janney.png",
	},
] as const;
