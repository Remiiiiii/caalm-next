import { HOW_IT_WORKS_STEPS } from "@/components/landing/landingContent";
import { DEMO_TIPS } from "@/lib/demo/tour/tips";

export type KnowledgeChunk = {
	id: string;
	title: string;
	body: string;
	href?: string;
	keywords: string[];
};

const PRODUCT_MAP: KnowledgeChunk[] = [
	{
		id: "product-overview",
		title: "What is CAALM",
		body: "CAALM is a compliance workspace for contracts, licenses, audits, analytics, and calendar workflows. Permissions control what each user can view or change.",
		keywords: ["caalm", "product", "overview", "compliance"],
	},
	{
		id: "module-contracts",
		title: "Contracts",
		body: "Upload and manage contracts, run approvals, track renewals and expiry alerts. Use the Contracts area in the sidebar.",
		href: "/contracts",
		keywords: ["contract", "upload", "approval", "renewal"],
	},
	{
		id: "module-licenses",
		title: "Licenses",
		body: "Track professional, facility, and software licenses with renewals and allocation. Use the Licenses area in the sidebar.",
		href: "/licenses",
		keywords: ["license", "renewal", "allocation"],
	},
	{
		id: "module-audits",
		title: "Audits & compliance",
		body: "Review compliance status, audit logs, and readiness metrics tied to contracts and licenses.",
		href: "/audits",
		keywords: ["audit", "compliance", "kri", "log"],
	},
	{
		id: "module-uploaded-audits",
		title: "Uploaded audits and findings",
		body: "Uploaded Audits extract findings from audit reports. Open a finding's details to read the Finding (what went wrong) and How to correct (the auditor's fix). Use Show me how to start a new Ask CAALM chat that confirms those steps and walks through the Corrective action section: start the action, upload evidence screenshots or PDFs, then Mark closed after a person checks the proof. CAALM does not close a corrective action for you.",
		href: "/audits/upload",
		keywords: [
			"uploaded",
			"finding",
			"corrective",
			"cap",
			"evidence",
			"show me how",
			"remediation",
		],
	},
	{
		id: "module-analytics",
		title: "Analytics & reports",
		body: "Organization and department analytics, contract and calendar insights, and exportable reports.",
		href: "/analytics",
		keywords: ["analytics", "report", "dashboard", "metrics"],
	},
	{
		id: "module-tasks",
		title: "Tasks",
		body: "Create and track team tasks (not_started, in_progress, blocked, done) under Team → Tasks. Pending tasks are open items that are not done yet. Use the Tasks page or ask the assistant to list your pending tasks from live data.",
		href: "/team/tasks",
		keywords: ["task", "tasks", "pending", "todo", "assignee", "due"],
	},
	{
		id: "module-calendar",
		title: "Calendar",
		body: "Shared calendars, delegations, approvals for events, and Outlook integration in Settings.",
		href: "/calendar",
		keywords: ["calendar", "event", "outlook", "meeting"],
	},
	{
		id: "module-rbac",
		title: "Roles and permissions",
		body: "Access is permission-based. Admins assign permissions to roles in role management. If you cannot see a feature, your role may lack the required permission.",
		href: "/settings",
		keywords: ["rbac", "permission", "role", "access"],
	},
];

function tourChunks(): KnowledgeChunk[] {
	return DEMO_TIPS.map((tip) => ({
		id: tip.id,
		title: tip.title,
		body: tip.body,
		href: tip.ctaHref,
		keywords: [
			tip.id.replace("demo-", ""),
			tip.title.toLowerCase(),
			...tip.body
				.toLowerCase()
				.split(/\W+/)
				.filter((w) => w.length > 4),
		],
	}));
}

function howItWorksChunks(): KnowledgeChunk[] {
	return HOW_IT_WORKS_STEPS.map((step) => ({
		id: `how-it-works-${step.step}`,
		title: step.title,
		body: step.description,
		keywords: ["onboarding", step.title.toLowerCase(), "how it works"],
	}));
}

export const ALL_KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
	...PRODUCT_MAP,
	...tourChunks(),
	...howItWorksChunks(),
];
