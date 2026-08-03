import { appwriteConfig } from "@/lib/appwrite/config";
import { demoRowId } from "./constants";
import { createRowIfMissing, tableHasColumns } from "./helpers";

/**
 * Seed secondary UI-visible collections when schemas exist.
 * Skips invitations / calendar resources / extensions when tables have no columns.
 */
export async function seedDemoSecondary({
	orgId,
	ownerUserId,
}: {
	orgId: string;
	ownerUserId: string;
}): Promise<void> {
	const draftsTable = appwriteConfig.contractDraftsCollectionId;
	const licenseDraftsTable = appwriteConfig.licenseDraftsCollectionId;
	const sharedCalendarsTable = appwriteConfig.sharedCalendarsCollectionId;
	const invitationsTable = appwriteConfig.invitationsCollectionId;
	const resourcesTable = appwriteConfig.calendarResourcesCollectionId;

	if (draftsTable && (await tableHasColumns(draftsTable))) {
		await createRowIfMissing(
			draftsTable,
			demoRowId(orgId, "ctrdraft"),
			{
				ownerId: ownerUserId,
				accountId: ownerUserId,
				currentStep: 2,
				progressPercentage: 40,
				lastSavedAt: new Date().toISOString(),
				isCompleted: false,
				formData: JSON.stringify({
					contractName: "Draft Vendor Services Agreement",
					department: "Operations",
					demo: true,
				}),
				extractedData: "",
				processedFileData: "",
				fileId: "",
			},
			"contract-draft",
		);
	}

	if (licenseDraftsTable && (await tableHasColumns(licenseDraftsTable))) {
		await createRowIfMissing(
			licenseDraftsTable,
			demoRowId(orgId, "licdraft"),
			{
				ownerId: ownerUserId,
				accountId: ownerUserId,
				currentStep: 1,
				progressPercentage: 25,
				lastSavedAt: new Date().toISOString(),
				isCompleted: false,
				formData: JSON.stringify({
					licenseName: "Draft Facility Permit",
					division: "clinic",
					demo: true,
				}),
				fileId: "",
			},
			"license-draft",
		);
	}

	if (sharedCalendarsTable && (await tableHasColumns(sharedCalendarsTable))) {
		const now = new Date().toISOString();
		await createRowIfMissing(
			sharedCalendarsTable,
			demoRowId(orgId, "sharecal"),
			{
				organizationId: orgId,
				name: "Compliance Team Calendar",
				description: "Shared demo calendar for compliance reviews",
				ownerId: ownerUserId,
				ownerAccountId: ownerUserId,
				color: "#0f5384",
				sharedWith: [ownerUserId],
				sharePermissions: JSON.stringify({ [ownerUserId]: "edit" }),
				isTeamCalendar: true,
				isPublic: false,
				isPrimaryCalendar: false,
				createdAt: now,
				updatedAt: now,
			},
			"shared-calendar",
		);
	}

	if (invitationsTable && (await tableHasColumns(invitationsTable))) {
		await createRowIfMissing(
			invitationsTable,
			demoRowId(orgId, "invite1"),
			{
				email: "demo+pending-invite@caalm.demo",
				orgId,
				department: "Operations",
				division: "clinic",
				status: "pending",
				invitedBy: ownerUserId,
			},
			"invitation",
		);
	}

	if (resourcesTable && (await tableHasColumns(resourcesTable))) {
		await createRowIfMissing(
			resourcesTable,
			demoRowId(orgId, "room01"),
			{
				name: "Board Room A",
				orgId,
				type: "room",
				capacity: 12,
				status: "available",
			},
			"calendar-resource",
		);
	}
}
