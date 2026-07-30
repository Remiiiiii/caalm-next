import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { demoRowId } from "./constants";
import {
	createRowIfMissing,
	getDbId,
	isoDateOffset,
	isoDateTimeOffset,
} from "./helpers";
import type { SeededTeamUser } from "./seed-team-users";

/**
 * Seed core org data: contracts, licenses, calendar, news, notes, activity,
 * notifications, and tasks — with normalized department/division enums.
 */
export async function seedDemoCoreData({
	orgId,
	ownerUserId,
	ownerName,
	ownerEmail,
	team,
}: {
	orgId: string;
	ownerUserId: string;
	ownerName: string;
	ownerEmail: string;
	team: SeededTeamUser[];
}): Promise<{ eventIds: string[] }> {
	const contractsTable = appwriteConfig.contractsCollectionId || "contracts";
	const licensesTable = appwriteConfig.licensesCollectionId || "licenses";
	const alex = team.find((t) => t.slug === "alex-rivera");
	const jordan = team.find((t) => t.slug === "jordan-lee");
	const morgan = team.find((t) => t.slug === "morgan-patel");

	const contracts = [
		{
			suffix: "ctrfac",
			contractName: "Acme Facilities Master Services",
			vendor: "Acme Facilities LLC",
			contractType: "Service_Agreement",
			contractNumber: `DEMO-FAC-${orgId.slice(0, 6)}`,
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(180),
			daysUntilExpiry: 180,
			compliance: "up-to-date",
			amount: 125000,
			priority: "Medium",
			department: "Administration",
			division: "hr",
			description: "Annual facilities and maintenance services.",
		},
		{
			suffix: "ctrmail",
			contractName: "CloudMail SaaS Subscription",
			vendor: "CloudMail Inc.",
			contractType: "Vendor_Service_Agreement",
			contractNumber: `DEMO-MAIL-${orgId.slice(0, 6)}`,
			lifecycleStatus: "under_review",
			contractExpiryDate: isoDateOffset(45),
			daysUntilExpiry: 45,
			compliance: "action-required",
			amount: 24000,
			priority: "High",
			department: "IT",
			division: "support",
			description: "Email platform renewal pending approval.",
		},
		{
			suffix: "ctrvault",
			contractName: "SecureVault Data Processing",
			vendor: "SecureVault Technologies",
			contractType: "Vendor_Contract",
			contractNumber: `DEMO-DPA-${orgId.slice(0, 6)}`,
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(12),
			daysUntilExpiry: 12,
			compliance: "action-required",
			amount: 48000,
			priority: "Urgent",
			department: "IT",
			division: "support",
			description: "Expiring soon — renewal notice sent.",
		},
		{
			suffix: "ctrprint",
			contractName: "Legacy Print Services 2023",
			vendor: "PrintWorks Co.",
			contractType: "Service_Agreement",
			contractNumber: `DEMO-PRT-${orgId.slice(0, 6)}`,
			lifecycleStatus: "expired",
			contractExpiryDate: isoDateOffset(-30),
			daysUntilExpiry: -30,
			compliance: "non-compliant",
			amount: 8500,
			priority: "Low",
			department: "Administration",
			division: "hr",
			description: "Expired — archive or renew.",
		},
		{
			suffix: "ctrbh",
			contractName: "Counseling Partners Network",
			vendor: "Counseling Partners LLC",
			contractType: "Consulting_Agreement",
			contractNumber: `DEMO-BH-${orgId.slice(0, 6)}`,
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(300),
			daysUntilExpiry: 300,
			compliance: "up-to-date",
			amount: 96000,
			priority: "Medium",
			department: "Operations",
			division: "behavioral-health",
			description: "Behavioral health referral network.",
		},
		{
			suffix: "ctrlease",
			contractName: "Office Lease — Suite 400",
			vendor: "Metro Property Group",
			contractType: "Lease_Agreement",
			contractNumber: `DEMO-LS-${orgId.slice(0, 6)}`,
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(400),
			daysUntilExpiry: 400,
			compliance: "up-to-date",
			amount: 210000,
			priority: "Medium",
			department: "Administration",
			division: "c-suite",
			description: "Headquarters office lease.",
		},
		{
			suffix: "ctrhelp",
			contractName: "IT Helpdesk Outsourcing",
			vendor: "Nexus Support",
			contractType: "Service_Agreement",
			contractNumber: `DEMO-HD-${orgId.slice(0, 6)}`,
			lifecycleStatus: "under_review",
			contractExpiryDate: isoDateOffset(90),
			daysUntilExpiry: 90,
			compliance: "up-to-date",
			amount: 72000,
			priority: "Medium",
			department: "IT",
			division: "help-desk",
			description: "Awaiting executive approval.",
		},
		{
			suffix: "ctrins",
			contractName: "Insurance Broker Agreement",
			vendor: "Harbor Insurance Brokers",
			contractType: "Vendor_Contract",
			contractNumber: `DEMO-INS-${orgId.slice(0, 6)}`,
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(220),
			daysUntilExpiry: 220,
			compliance: "up-to-date",
			amount: 15000,
			priority: "Low",
			department: "Finance",
			division: "accounting",
			description: "Annual liability and property coverage broker.",
		},
		{
			suffix: "ctrclinic",
			contractName: "Clinic Supplies Agreement",
			vendor: "MedSupply Co.",
			contractType: "Purchase_Order",
			contractNumber: `DEMO-CL-${orgId.slice(0, 6)}`,
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(160),
			daysUntilExpiry: 160,
			compliance: "up-to-date",
			amount: 42000,
			priority: "Medium",
			department: "Operations",
			division: "clinic",
			description: "Clinical supplies and equipment.",
		},
	];

	for (const c of contracts) {
		await createRowIfMissing(
			contractsTable,
			demoRowId(orgId, c.suffix),
			{
				contractName: c.contractName,
				contractNumber: c.contractNumber,
				vendor: c.vendor,
				contractType: c.contractType,
				lifecycleStatus: c.lifecycleStatus,
				contractExpiryDate: c.contractExpiryDate,
				daysUntilExpiry: c.daysUntilExpiry,
				compliance: c.compliance,
				amount: c.amount,
				currencyCode: "USD",
				priority: c.priority,
				department: c.department,
				division: c.division,
				description: c.description,
				contractOwnerId: ownerUserId,
				assignedManagers: [ownerName],
				orgId,
				autoRenew: false,
				startDate: isoDateOffset(-60),
			},
			`contract:${c.suffix}`,
		);
	}

	const licenses = [
		{
			suffix: "licbol",
			licenseName: "Business Operating License",
			licenseNumber: "BOL-2024-1001",
			licenseType: "Business",
			licenseExpiryDate: isoDateOffset(200),
			issuingAuthority: "State Licensing Board",
			issueDate: isoDateOffset(-400),
			status: "active",
			compliance: "compliant",
			division: "administration",
			daysUntilExpiry: 200,
		},
		{
			suffix: "liccpp",
			licenseName: "Clinical Practice Permit",
			licenseNumber: "CPP-88421",
			licenseType: "Healthcare",
			licenseExpiryDate: isoDateOffset(20),
			issuingAuthority: "Dept. of Health",
			issueDate: isoDateOffset(-345),
			status: "active",
			compliance: "at-risk",
			division: "clinic",
			daysUntilExpiry: 20,
		},
		{
			suffix: "licsaas",
			licenseName: "Software — Analytics Suite",
			licenseNumber: "SW-ANL-009",
			licenseType: "Software",
			licenseExpiryDate: isoDateOffset(60),
			issuingAuthority: "Vendor License Key",
			issueDate: isoDateOffset(-300),
			status: "active",
			compliance: "compliant",
			division: "administration",
			vendor: "InsightMetrics",
			category: "saas",
			daysUntilExpiry: 60,
		},
		{
			suffix: "lictrp",
			licenseName: "Transportation Permit",
			licenseNumber: "TRP-5521",
			licenseType: "Transportation",
			licenseExpiryDate: isoDateOffset(-5),
			issuingAuthority: "DOT",
			issueDate: isoDateOffset(-370),
			status: "expired",
			compliance: "non-compliant",
			division: "administration",
			daysUntilExpiry: -5,
		},
		{
			suffix: "licbhf",
			licenseName: "Behavioral Health Facility License",
			licenseNumber: "BHF-3310",
			licenseType: "Healthcare",
			licenseExpiryDate: isoDateOffset(150),
			issuingAuthority: "Dept. of Health",
			issueDate: isoDateOffset(-200),
			status: "active",
			compliance: "compliant",
			division: "behavioralhealth",
			daysUntilExpiry: 150,
		},
		{
			suffix: "licfhc",
			licenseName: "Suspended — Food Handler Cert",
			licenseNumber: "FHC-0199",
			licenseType: "Certification",
			licenseExpiryDate: isoDateOffset(90),
			issuingAuthority: "County Health",
			issueDate: isoDateOffset(-100),
			status: "suspended",
			compliance: "action-required",
			division: "residential",
			daysUntilExpiry: 90,
		},
		{
			suffix: "licfop",
			licenseName: "Pending Review — Facility Occupancy Permit",
			licenseNumber: "FOP-7781",
			licenseType: "Business",
			licenseExpiryDate: isoDateOffset(120),
			issuingAuthority: "City Planning",
			issueDate: isoDateOffset(-30),
			status: "pending-review",
			compliance: "action-required",
			division: "administration",
			cost: 1850,
			daysUntilExpiry: 120,
		},
		{
			suffix: "licncl",
			licenseName: "Pending Review — Nonprofit Counseling License",
			licenseNumber: "NCL-4420",
			licenseType: "Healthcare",
			licenseExpiryDate: isoDateOffset(240),
			issuingAuthority: "Dept. of Health",
			issueDate: isoDateOffset(-15),
			status: "pending-review",
			compliance: "at-risk",
			division: "behavioralhealth",
			cost: 4200,
			daysUntilExpiry: 240,
		},
	];

	for (const lic of licenses) {
		await createRowIfMissing(
			licensesTable,
			demoRowId(orgId, lic.suffix),
			{
				licenseName: lic.licenseName,
				licenseNumber: lic.licenseNumber,
				licenseType: lic.licenseType,
				licenseExpiryDate: lic.licenseExpiryDate,
				issuingAuthority: lic.issuingAuthority,
				issueDate: lic.issueDate,
				status: lic.status,
				compliance: lic.compliance,
				division: lic.division,
				daysUntilExpiry: lic.daysUntilExpiry,
				assignedManagers: [ownerUserId.slice(0, 36)],
				orgId,
				currencyCode: "USD",
				...(lic.vendor ? { vendor: lic.vendor } : {}),
				...(lic.category ? { category: lic.category } : {}),
				...(lic.cost != null ? { cost: lic.cost } : {}),
			},
			`license:${lic.suffix}`,
		);
	}

	const events = [
		{
			suffix: "evcomp",
			title: "Quarterly Compliance Review",
			type: "audit",
			startDate: isoDateTimeOffset(3, 14),
			endDate: isoDateTimeOffset(3, 15),
			description: "Review open audit items and renewals.",
			approvalStatus: "approved",
			createdBy: ownerUserId,
		},
		{
			suffix: "evrenew",
			title: "Contract Renewal Workshop",
			type: "meeting",
			startDate: isoDateTimeOffset(7, 10),
			endDate: isoDateTimeOffset(7, 11),
			description: "Prioritize expiring contracts.",
			approvalStatus: "pending",
			requiresApproval: true,
			createdBy: alex?.userId || ownerUserId,
		},
		{
			suffix: "evboard",
			title: "Board Prep — License Status",
			type: "review",
			startDate: isoDateTimeOffset(10, 9),
			endDate: isoDateTimeOffset(10, 10),
			description: "Prepare license dashboard for board packet.",
			approvalStatus: "pending",
			requiresApproval: true,
			createdBy: jordan?.userId || ownerUserId,
		},
		{
			suffix: "evsafe",
			title: "All-Hands Safety Briefing",
			type: "meeting",
			startDate: isoDateTimeOffset(14, 13),
			endDate: isoDateTimeOffset(14, 14),
			description: "Mandatory safety and compliance briefing.",
			approvalStatus: "approved",
			createdBy: ownerUserId,
		},
		{
			suffix: "evvend",
			title: "Vendor Onboarding — SecureVault",
			type: "deadline",
			startDate: isoDateTimeOffset(5, 11),
			endDate: isoDateTimeOffset(5, 12),
			description: "Kickoff call for DPA renewal.",
			approvalStatus: "approved",
			createdBy: morgan?.userId || ownerUserId,
		},
	];

	const eventIds: string[] = [];
	const eventsTable =
		appwriteConfig.calendarEventsCollectionId || "calendar_events";

	for (const ev of events) {
		const id = await createRowIfMissing(
			eventsTable,
			demoRowId(orgId, ev.suffix),
			{
				title: ev.title,
				type: ev.type,
				startDate: ev.startDate,
				endDate: ev.endDate,
				description: ev.description,
				approvalStatus: ev.approvalStatus,
				requiresApproval: Boolean(ev.requiresApproval),
				createdBy: ev.createdBy,
				createdByUserId: ev.createdBy,
				orgId,
			},
			`event:${ev.suffix}`,
		);
		if (id) eventIds.push(id);
	}

	if (
		appwriteConfig.calendarApprovalRequestsCollectionId &&
		eventIds.length >= 2
	) {
		for (let i = 1; i <= 2 && i < eventIds.length; i++) {
			await createRowIfMissing(
				appwriteConfig.calendarApprovalRequestsCollectionId,
				demoRowId(orgId, `cap${i}`),
				{
					eventId: eventIds[i],
					requestedByAccountId: ownerUserId,
					requestedByUserId: ownerUserId,
					changeType: "create",
					status: "pending",
					submittedAt: new Date().toISOString(),
					sensitivityLevel: "standard",
					orgId,
				},
				`calendar-approval:${i}`,
			);
		}
	}

	const newsTable = appwriteConfig.newsArticlesCollectionId || "news_articles";
	const newsItems = [
		{
			suffix: "news1",
			title: "Welcome to your CAALM sandbox",
			content:
				"<p>This is fictional demo data for Acme Compliance. Explore contracts, licenses, calendar approvals, and dashboards — nothing here is a real customer record.</p>",
			type: "announcement",
			priority: "high",
		},
		{
			suffix: "news2",
			title: "Tip: Track expiring agreements",
			content:
				"<p>Use the contracts and licenses views to filter by expiry and compliance status. Pending approvals show up on manager dashboards.</p>",
			type: "update",
			priority: "medium",
		},
		{
			suffix: "news3",
			title: "Demo: Internal news works like prod",
			content:
				"<p>Content creators can draft and publish internal news. This article was seeded so the feed is not empty.</p>",
			type: "info",
			priority: "low",
		},
	];

	for (const article of newsItems) {
		await createRowIfMissing(
			newsTable,
			demoRowId(orgId, article.suffix),
			{
				title: article.title,
				content: article.content,
				type: article.type,
				priority: article.priority,
				status: "published",
				authorId: ownerUserId,
				author: ownerName,
				department: "Administration",
				tags: ["demo"],
				viewCount: 0,
				orgId,
				thumbnailUrl: "",
				thumbnailPrompt: "",
			},
			`news:${article.suffix}`,
		);
	}

	if (appwriteConfig.notesCollectionId) {
		const notes = [
			{
				suffix: "note1",
				title: "CloudMail follow-up",
				content: "Follow up on CloudMail renewal this week.",
			},
			{
				suffix: "note2",
				title: "Board packet reminder",
				content: "Board packet: include Clinical Practice Permit status.",
			},
			{
				suffix: "note3",
				title: "SecureVault kickoff",
				content: "Schedule vendor kickoff for SecureVault.",
			},
		];
		for (const note of notes) {
			await createRowIfMissing(
				appwriteConfig.notesCollectionId,
				demoRowId(orgId, note.suffix),
				{
					title: note.title,
					content: note.content,
					userId: ownerUserId,
					userName: ownerName,
					orgId,
				},
				`note:${note.suffix}`,
			);
		}
	}

	if (appwriteConfig.recentActivityCollectionId) {
		const activities = [
			"Demo sandbox provisioned",
			"Viewed pending contract approvals",
			"Opened license compliance dashboard",
			"Scheduled compliance review event",
			"Published welcome news article",
			"Assigned task to Department Manager",
		];
		for (let i = 0; i < activities.length; i++) {
			await createRowIfMissing(
				appwriteConfig.recentActivityCollectionId,
				demoRowId(orgId, `act${i}`),
				{
					action: "demo_seed",
					description: activities[i],
					userId: ownerUserId,
					userName: ownerName,
					type: i % 2 === 0 ? "user" : "contract",
					timestamp: new Date().toISOString(),
					orgId,
					division: "management",
				},
				`activity:${i}`,
			);
		}
	}

	if (appwriteConfig.notificationsCollectionId) {
		const notifications = [
			{
				suffix: "n1",
				title: "Contract pending approval",
				message: "CloudMail SaaS Subscription needs your review.",
				type: "contract",
				userId: alex?.userId || ownerUserId,
			},
			{
				suffix: "n2",
				title: "License expiring soon",
				message: "Clinical Practice Permit expires in about 20 days.",
				type: "license",
				userId: jordan?.userId || ownerUserId,
			},
			{
				suffix: "n3",
				title: "Calendar approval requested",
				message: "Contract Renewal Workshop is awaiting approval.",
				type: "calendar",
				userId: ownerUserId,
			},
			{
				suffix: "n4",
				title: "Welcome to CAALM Demo",
				message: "Your sandbox org is ready. Explore the dashboards.",
				type: "system",
				userId: ownerUserId,
			},
			{
				suffix: "n5",
				title: "Expired license detected",
				message: "Transportation Permit is past expiry.",
				type: "license",
				userId: ownerUserId,
			},
			{
				suffix: "n6",
				title: "Task assigned to you",
				message: "Review pending Facility Occupancy Permit workflow.",
				type: "task",
				userId: alex?.userId || ownerUserId,
			},
		];
		for (const n of notifications) {
			await createRowIfMissing(
				appwriteConfig.notificationsCollectionId,
				demoRowId(orgId, n.suffix),
				{
					title: n.title,
					message: n.message,
					type: n.type,
					userId: n.userId,
					orgId,
					read: false,
				},
				`notification:${n.suffix}`,
			);
		}
	}

	const tasksTable = appwriteConfig.tasksCollectionId || "tasks";
	const tasks = [
		{
			suffix: "tsk1",
			title: "Review Facility Occupancy Permit",
			description: "Complete department review for the pending occupancy permit.",
			status: "in_progress",
			priority: "high",
			dueDate: isoDateTimeOffset(5, 17),
			department: "Administration",
			assigneeId: alex?.userId || ownerUserId,
			linkedEntityType: "license",
		},
		{
			suffix: "tsk2",
			title: "Prepare CloudMail renewal packet",
			description: "Gather pricing and SLA notes before executive approval.",
			status: "not_started",
			priority: "urgent",
			dueDate: isoDateTimeOffset(2, 12),
			department: "IT",
			assigneeId: morgan?.userId || ownerUserId,
			linkedEntityType: "contract",
		},
		{
			suffix: "tsk3",
			title: "Audit transportation permit gap",
			description: "Document remediation steps for the expired DOT permit.",
			status: "blocked",
			priority: "medium",
			dueDate: isoDateTimeOffset(8, 15),
			department: "Administration",
			assigneeId: ownerUserId,
			linkedEntityType: "license",
		},
		{
			suffix: "tsk4",
			title: "Update board license summary",
			description: "Draft the license status slide for next board packet.",
			status: "done",
			priority: "low",
			dueDate: isoDateTimeOffset(-1, 16),
			department: "Operations",
			assigneeId: jordan?.userId || ownerUserId,
			linkedEntityType: "none",
			completedAt: isoDateTimeOffset(-1, 15),
		},
	];

	for (const task of tasks) {
		await createRowIfMissing(
			tasksTable,
			demoRowId(orgId, task.suffix),
			{
				title: task.title,
				description: task.description,
				status: task.status,
				priority: task.priority,
				dueDate: task.dueDate,
				department: task.department,
				linkedEntityType: task.linkedEntityType,
				orgId,
				assigneeId: task.assigneeId,
				createdById: ownerUserId,
				...(task.completedAt ? { completedAt: task.completedAt } : {}),
			},
			`task:${task.suffix}`,
		);
	}

	return { eventIds };
}

/** Bump org.settings.seedVersion after a successful seed. */
export async function bumpOrgSeedVersion(
	orgId: string,
	version: number,
): Promise<void> {
	const { tablesDB } = await createAdminClient();
	const db = getDbId();

	try {
		const org = await tablesDB.getRow({
			databaseId: db,
			tableId: "organizations",
			rowId: orgId,
		});

		let settings: Record<string, unknown> = {};
		if (typeof org.settings === "string") {
			try {
				settings = JSON.parse(org.settings) as Record<string, unknown>;
			} catch {
				settings = {};
			}
		} else if (org.settings && typeof org.settings === "object") {
			settings = { ...(org.settings as Record<string, unknown>) };
		}

		settings.seedVersion = version;

		await tablesDB.updateRow({
			databaseId: db,
			tableId: "organizations",
			rowId: orgId,
			data: {
				settings: JSON.stringify(settings),
			},
		});
	} catch (error) {
		console.error("[bumpOrgSeedVersion] failed:", error);
	}
}

export async function getOrgSeedVersion(orgId: string): Promise<number> {
	const { tablesDB } = await createAdminClient();
	try {
		const org = await tablesDB.getRow({
			databaseId: getDbId(),
			tableId: "organizations",
			rowId: orgId,
		});
		let settings: Record<string, unknown> = {};
		if (typeof org.settings === "string") {
			try {
				settings = JSON.parse(org.settings) as Record<string, unknown>;
			} catch {
				return 0;
			}
		} else if (org.settings && typeof org.settings === "object") {
			settings = org.settings as Record<string, unknown>;
		}
		const v = settings.seedVersion;
		return typeof v === "number" ? v : 0;
	} catch {
		return 0;
	}
}
