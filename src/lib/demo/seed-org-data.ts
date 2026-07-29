/**
 * Seed fictional org-scoped data for a visitor sandbox.
 */

import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

function isoDateOffset(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().split("T")[0];
}

function isoDateTimeOffset(days: number, hour = 10): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	d.setHours(hour, 0, 0, 0);
	return d.toISOString();
}

export async function seedDemoOrgData({
	orgId,
	userId,
	ownerEmail,
	ownerName,
}: {
	orgId: string;
	userId: string;
	ownerEmail: string;
	ownerName: string;
}): Promise<void> {
	const { tablesDB } = await createAdminClient();
	const db = appwriteConfig.databaseId || "default-db";

	const contracts = [
		{
			contractName: "Acme Facilities Master Services",
			vendor: "Acme Facilities LLC",
			contractType: "Service Agreement",
			status: "active",
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(180),
			daysUntilExpiry: 180,
			compliance: "compliant",
			amount: 125000,
			currencyCode: "USD",
			priority: "medium",
			department: "administration",
			description: "Annual facilities and maintenance services.",
		},
		{
			contractName: "CloudMail SaaS Subscription",
			vendor: "CloudMail Inc.",
			contractType: "SaaS",
			status: "pending-review",
			lifecycleStatus: "pending_approval",
			contractExpiryDate: isoDateOffset(45),
			daysUntilExpiry: 45,
			compliance: "at-risk",
			amount: 24000,
			currencyCode: "USD",
			priority: "high",
			department: "administration",
			description: "Email platform renewal pending approval.",
		},
		{
			contractName: "SecureVault Data Processing",
			vendor: "SecureVault Technologies",
			contractType: "Data Processing Agreement",
			status: "active",
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(12),
			daysUntilExpiry: 12,
			compliance: "at-risk",
			amount: 48000,
			currencyCode: "USD",
			priority: "high",
			department: "administration",
			description: "Expiring soon — renewal notice sent.",
		},
		{
			contractName: "Legacy Print Services 2023",
			vendor: "PrintWorks Co.",
			contractType: "Service Agreement",
			status: "action-required",
			lifecycleStatus: "expired",
			contractExpiryDate: isoDateOffset(-30),
			daysUntilExpiry: -30,
			compliance: "non-compliant",
			amount: 8500,
			currencyCode: "USD",
			priority: "low",
			department: "administration",
			description: "Expired — archive or renew.",
		},
		{
			contractName: "Counseling Partners Network",
			vendor: "Counseling Partners LLC",
			contractType: "Professional Services",
			status: "active",
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(300),
			daysUntilExpiry: 300,
			compliance: "compliant",
			amount: 96000,
			currencyCode: "USD",
			priority: "medium",
			department: "behavioralhealth",
			description: "Behavioral health referral network.",
		},
		{
			contractName: "Office Lease — Suite 400",
			vendor: "Metro Property Group",
			contractType: "Lease",
			status: "active",
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(400),
			daysUntilExpiry: 400,
			compliance: "compliant",
			amount: 210000,
			currencyCode: "USD",
			priority: "medium",
			department: "administration",
			description: "Headquarters office lease.",
		},
		{
			contractName: "IT Helpdesk Outsourcing",
			vendor: "Nexus Support",
			contractType: "Service Agreement",
			status: "pending-review",
			lifecycleStatus: "pending_approval",
			contractExpiryDate: isoDateOffset(90),
			daysUntilExpiry: 90,
			compliance: "compliant",
			amount: 72000,
			currencyCode: "USD",
			priority: "medium",
			department: "administration",
			description: "Awaiting executive approval.",
		},
		{
			contractName: "Insurance Broker Agreement",
			vendor: "Harbor Insurance Brokers",
			contractType: "Broker Agreement",
			status: "active",
			lifecycleStatus: "active",
			contractExpiryDate: isoDateOffset(220),
			daysUntilExpiry: 220,
			compliance: "compliant",
			amount: 15000,
			currencyCode: "USD",
			priority: "low",
			department: "administration",
			description: "Annual liability and property coverage broker.",
		},
	];

	for (const c of contracts) {
		try {
			await tablesDB.createRow({
				databaseId: db,
				tableId: appwriteConfig.contractsCollectionId || "contracts",
				rowId: ID.unique(),
				data: {
					...c,
					contractOwnerId: userId,
					assignedManagers: [ownerName],
					orgId,
					autoRenew: false,
					currencyCode: c.currencyCode || "USD",
				},
			});
		} catch (error) {
			console.error("[seedDemoOrgData] contract seed failed:", error);
		}
	}

	const licenses = [
		{
			licenseName: "Business Operating License",
			licenseNumber: "BOL-2024-1001",
			licenseType: "Business",
			licenseExpiryDate: isoDateOffset(200),
			issuingAuthority: "State Licensing Board",
			issueDate: isoDateOffset(-400),
			status: "active",
			compliance: "compliant",
			division: "administration",
		},
		{
			licenseName: "Clinical Practice Permit",
			licenseNumber: "CPP-88421",
			licenseType: "Healthcare",
			licenseExpiryDate: isoDateOffset(20),
			issuingAuthority: "Dept. of Health",
			issueDate: isoDateOffset(-345),
			status: "active",
			compliance: "at-risk",
			division: "clinic",
		},
		{
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
		},
		{
			licenseName: "Transportation Permit",
			licenseNumber: "TRP-5521",
			licenseType: "Transportation",
			licenseExpiryDate: isoDateOffset(-5),
			issuingAuthority: "DOT",
			issueDate: isoDateOffset(-370),
			status: "expired",
			compliance: "non-compliant",
			division: "administration",
		},
		{
			licenseName: "Behavioral Health Facility License",
			licenseNumber: "BHF-3310",
			licenseType: "Healthcare",
			licenseExpiryDate: isoDateOffset(150),
			issuingAuthority: "Dept. of Health",
			issueDate: isoDateOffset(-200),
			status: "active",
			compliance: "compliant",
			division: "behavioralhealth",
		},
		{
			licenseName: "Suspended — Food Handler Cert",
			licenseNumber: "FHC-0199",
			licenseType: "Certification",
			licenseExpiryDate: isoDateOffset(90),
			issuingAuthority: "County Health",
			issueDate: isoDateOffset(-100),
			status: "suspended",
			compliance: "action-required",
			division: "residential",
		},
		{
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
		},
		{
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
		},
	];

	function buildPendingLicenseWorkflow(ownerId: string): {
		approvalWorkflowState: string;
		currentApprovalStage: string;
	} {
		const derivedAt = new Date().toISOString();
		const state = {
			version: 1 as const,
			currentStepIndex: 1,
			derivedAt,
			steps: [
				{
					id: "submitted",
					kind: "submitted",
					label: "Submitted",
					assigneeUserIds: [ownerId],
					status: "complete",
					completedAt: derivedAt,
					completedByUserId: ownerId,
					decision: "approved",
				},
				{
					id: "department_review",
					kind: "department_review",
					label: "Department review",
					assigneeUserIds: [ownerId],
					status: "current",
				},
				{
					id: "executive_approval",
					kind: "executive_approval",
					label: "Executive approval",
					assigneeUserIds: [ownerId],
					status: "pending",
				},
				{
					id: "activated",
					kind: "activated",
					label: "Activated",
					assigneeUserIds: [],
					status: "pending",
				},
			],
			notifications: [],
		};
		return {
			approvalWorkflowState: JSON.stringify(state),
			currentApprovalStage: "Department review",
		};
	}

	for (const lic of licenses) {
		try {
			const workflow =
				lic.status === "pending-review"
					? buildPendingLicenseWorkflow(userId)
					: {};
			await tablesDB.createRow({
				databaseId: db,
				tableId: appwriteConfig.licensesCollectionId || "licenses",
				rowId: ID.unique(),
				data: {
					...lic,
					licenseOwnerId: userId,
					assignedManagers: [userId],
					orgId,
					createdBy: userId,
					currencyCode: "USD",
					autoRenew: false,
					...workflow,
				},
			});
		} catch (error) {
			console.error("[seedDemoOrgData] license seed failed:", error);
		}
	}

	const events = [
		{
			title: "Quarterly Compliance Review",
			startDate: isoDateTimeOffset(3, 14),
			endDate: isoDateTimeOffset(3, 15),
			description: "Review open audit items and renewals.",
			status: "approved",
		},
		{
			title: "Contract Renewal Workshop",
			startDate: isoDateTimeOffset(7, 10),
			endDate: isoDateTimeOffset(7, 11),
			description: "Prioritize expiring contracts.",
			status: "pending",
		},
		{
			title: "Board Prep — License Status",
			startDate: isoDateTimeOffset(10, 9),
			endDate: isoDateTimeOffset(10, 10),
			description: "Prepare license dashboard for board packet.",
			status: "pending",
		},
		{
			title: "All-Hands Safety Briefing",
			startDate: isoDateTimeOffset(14, 13),
			endDate: isoDateTimeOffset(14, 14),
			description: "Mandatory safety and compliance briefing.",
			status: "approved",
		},
		{
			title: "Vendor Onboarding — SecureVault",
			startDate: isoDateTimeOffset(5, 11),
			endDate: isoDateTimeOffset(5, 12),
			description: "Kickoff call for DPA renewal.",
			status: "approved",
		},
	];

	const eventIds: string[] = [];
	for (const ev of events) {
		try {
			const row = await tablesDB.createRow({
				databaseId: db,
				tableId: appwriteConfig.calendarEventsCollectionId || "calendar_events",
				rowId: ID.unique(),
				data: {
					...ev,
					createdBy: userId,
					orgId,
					allDay: false,
				},
			});
			eventIds.push(row.$id);
		} catch (error) {
			console.error("[seedDemoOrgData] calendar event seed failed:", error);
		}
	}

	if (
		appwriteConfig.calendarApprovalRequestsCollectionId &&
		eventIds.length >= 2
	) {
		for (const eventId of eventIds.slice(1, 3)) {
			try {
				await tablesDB.createRow({
					databaseId: db,
					tableId: appwriteConfig.calendarApprovalRequestsCollectionId,
					rowId: ID.unique(),
					data: {
						eventId,
						requestedBy: userId,
						status: "pending",
						orgId,
					},
				});
			} catch (error) {
				console.error("[seedDemoOrgData] calendar approval seed failed:", error);
			}
		}
	}

	const newsItems = [
		{
			title: "Welcome to your CAALM sandbox",
			content:
				"<p>This is fictional demo data for Acme Compliance. Explore contracts, licenses, calendar approvals, and dashboards — nothing here is a real customer record.</p>",
			type: "announcement",
			priority: "high",
			status: "published",
		},
		{
			title: "Tip: Track expiring agreements",
			content:
				"<p>Use the contracts and licenses views to filter by expiry and compliance status. Pending approvals show up on manager dashboards.</p>",
			type: "update",
			priority: "medium",
			status: "published",
		},
		{
			title: "Demo: Internal news works like prod",
			content:
				"<p>Content creators can draft and publish internal news. This article was seeded so the feed is not empty.</p>",
			type: "news",
			priority: "low",
			status: "published",
		},
	];

	for (const article of newsItems) {
		try {
			await tablesDB.createRow({
				databaseId: db,
				tableId: appwriteConfig.newsArticlesCollectionId || "news_articles",
				rowId: ID.unique(),
				data: {
					...article,
					authorId: userId,
					author: ownerName,
					department: "administration",
					tags: ["demo"],
					viewCount: 0,
					orgId,
					thumbnailUrl: "",
					thumbnailPrompt: "",
				},
			});
		} catch (error) {
			console.error("[seedDemoOrgData] news seed failed:", error);
		}
	}

	if (appwriteConfig.notesCollectionId) {
		const notes = [
			"Follow up on CloudMail renewal this week.",
			"Board packet: include Clinical Practice Permit status.",
			"Schedule vendor kickoff for SecureVault.",
		];
		for (const content of notes) {
			try {
				await tablesDB.createRow({
					databaseId: db,
					tableId: appwriteConfig.notesCollectionId,
					rowId: ID.unique(),
					data: {
						content,
						userId,
						orgId,
						createdBy: userId,
					},
				});
			} catch (error) {
				console.error("[seedDemoOrgData] notes seed failed:", error);
			}
		}
	}

	if (appwriteConfig.recentActivityCollectionId) {
		const activities = [
			"Demo sandbox provisioned",
			"Viewed pending contract approvals",
			"Opened license compliance dashboard",
			"Scheduled compliance review event",
			"Published welcome news article",
		];
		for (const summary of activities) {
			try {
				await tablesDB.createRow({
					databaseId: db,
					tableId: appwriteConfig.recentActivityCollectionId,
					rowId: ID.unique(),
					data: {
						summary,
						action: "demo_seed",
						userId,
						userName: ownerName,
						userEmail: ownerEmail,
						orgId,
						module: "demo",
						status: "success",
					},
				});
			} catch (error) {
				console.error("[seedDemoOrgData] activity seed failed:", error);
			}
		}
	}

	if (appwriteConfig.notificationsCollectionId) {
		const notifications = [
			{
				title: "Contract pending approval",
				message: "CloudMail SaaS Subscription needs your review.",
				type: "contract",
			},
			{
				title: "License expiring soon",
				message: "Clinical Practice Permit expires in about 20 days.",
				type: "license",
			},
			{
				title: "Calendar approval requested",
				message: "Contract Renewal Workshop is awaiting approval.",
				type: "calendar",
			},
			{
				title: "Welcome to CAALM Demo",
				message: "Your sandbox org is ready. Explore the dashboards.",
				type: "system",
			},
			{
				title: "Expired license detected",
				message: "Transportation Permit is past expiry.",
				type: "license",
			},
			{
				title: "Task assigned to you",
				message: "Review pending Facility Occupancy Permit workflow.",
				type: "task",
			},
		];
		for (const n of notifications) {
			try {
				await tablesDB.createRow({
					databaseId: db,
					tableId: appwriteConfig.notificationsCollectionId,
					rowId: ID.unique(),
					data: {
						...n,
						userId,
						orgId,
						read: false,
						createdBy: "system",
					},
				});
			} catch (error) {
				console.error("[seedDemoOrgData] notification seed failed:", error);
			}
		}
	}

	const tasksTableId = appwriteConfig.tasksCollectionId || "tasks";
	const tasks = [
		{
			title: "Review Facility Occupancy Permit",
			description: "Complete department review for the pending occupancy permit.",
			status: "in_progress",
			priority: "high",
			dueDate: isoDateTimeOffset(5, 17),
			department: "administration",
			linkedEntityType: "license",
		},
		{
			title: "Prepare CloudMail renewal packet",
			description: "Gather pricing and SLA notes before executive approval.",
			status: "not_started",
			priority: "urgent",
			dueDate: isoDateTimeOffset(2, 12),
			department: "administration",
			linkedEntityType: "contract",
		},
		{
			title: "Audit transportation permit gap",
			description: "Document remediation steps for the expired DOT permit.",
			status: "blocked",
			priority: "medium",
			dueDate: isoDateTimeOffset(8, 15),
			department: "administration",
			linkedEntityType: "license",
		},
		{
			title: "Update board license summary",
			description: "Draft the license status slide for next board packet.",
			status: "done",
			priority: "low",
			dueDate: isoDateTimeOffset(-1, 16),
			department: "administration",
			linkedEntityType: "none",
			completedAt: isoDateTimeOffset(-1, 15),
		},
	];
	for (const task of tasks) {
		try {
			await tablesDB.createRow({
				databaseId: db,
				tableId: tasksTableId,
				rowId: ID.unique(),
				data: {
					...task,
					orgId,
					assigneeId: userId,
					createdById: userId,
				},
			});
		} catch (error) {
			console.error("[seedDemoOrgData] task seed failed:", error);
		}
	}

	if (appwriteConfig.filesCollectionId) {
		const sampleFiles = [
			{
				name: "demo-welcome.pdf",
				type: "document",
				extension: "pdf",
				size: 245760,
				url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
			},
			{
				name: "demo-facility.jpg",
				type: "image",
				extension: "jpg",
				size: 512000,
				url: "https://picsum.photos/seed/caalm-demo/800/600.jpg",
			},
			{
				name: "demo-overview.mp4",
				type: "video",
				extension: "mp4",
				size: 1048576,
				url: "https://www.w3schools.com/html/mov_bbb.mp4",
			},
		];
		for (const file of sampleFiles) {
			try {
				await tablesDB.createRow({
					databaseId: db,
					tableId: appwriteConfig.filesCollectionId,
					rowId: ID.unique(),
					data: {
						...file,
						bucketFileId: `demo-${file.extension}-${ID.unique().slice(0, 8)}`,
						accountId: userId,
						orgId,
						users: [userId],
						isContract: false,
						status: "active",
					},
				});
			} catch (error) {
				console.error("[seedDemoOrgData] file seed failed:", error);
			}
		}
	}
}
