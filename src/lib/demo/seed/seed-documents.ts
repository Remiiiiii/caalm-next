import fs from "node:fs";
import path from "node:path";
import { FileService } from "@/lib/api/contracts/services/FileService";
import { appwriteConfig } from "@/lib/appwrite/config";
import { constructFileUrl } from "@/lib/utils";
import { demoRowId } from "./constants";
import { createRowIfMissing } from "./helpers";

export type SeededDocuments = {
	contractFileId: string | null;
	licenseFileId: string | null;
	grantContractId: string | null;
	residentialLicenseId: string | null;
};

function readPublicPdf(relativeUnderPublic: string): Buffer | null {
	const filePath = path.join(process.cwd(), "public", relativeUnderPublic);
	try {
		return fs.readFileSync(filePath);
	} catch (error) {
		console.error(`[seedDemoDocuments] missing PDF at ${filePath}:`, error);
		return null;
	}
}

/**
 * Upload sample contract/license PDFs to Storage and create linked DB rows.
 */
export async function seedDemoDocuments({
	orgId,
	ownerUserId,
	ownerName,
}: {
	orgId: string;
	ownerUserId: string;
	ownerName: string;
}): Promise<SeededDocuments> {
	const filesTable = appwriteConfig.filesCollectionId || "files";
	const contractsTable = appwriteConfig.contractsCollectionId || "contracts";
	const licensesTable = appwriteConfig.licensesCollectionId || "licenses";

	const result: SeededDocuments = {
		contractFileId: null,
		licenseFileId: null,
		grantContractId: null,
		residentialLicenseId: null,
	};

	const grantPdf = readPublicPdf(
		"assets/demo/Government_Nonprofit_Grant_Agreement.pdf",
	);
	const licensePdf = readPublicPdf(
		"assets/demo/Nonprofit_Residential_License_v2.pdf",
	);

	let grantBucketId: string | null = null;
	let licenseBucketId: string | null = null;

	if (grantPdf) {
		try {
			grantBucketId = await FileService.uploadFileToStorage(
				grantPdf,
				"Government_Nonprofit_Grant_Agreement.pdf",
			);
		} catch (error) {
			console.error("[seedDemoDocuments] grant PDF upload failed:", error);
		}
	}

	if (licensePdf) {
		try {
			licenseBucketId = await FileService.uploadFileToStorage(
				licensePdf,
				"Nonprofit_Residential_License_v2.pdf",
			);
		} catch (error) {
			console.error("[seedDemoDocuments] license PDF upload failed:", error);
		}
	}

	if (grantBucketId) {
		const fileRowId = demoRowId(orgId, "filegrant");
		const fileId = await createRowIfMissing(
			filesTable,
			fileRowId,
			{
				name: "Government_Nonprofit_Grant_Agreement.pdf",
				url: constructFileUrl(grantBucketId),
				bucketFileId: grantBucketId,
				type: "document",
				extension: "pdf",
				size: grantPdf?.length ?? 0,
				accountId: ownerUserId,
				users: [ownerUserId],
				isContract: true,
				orgId,
				status: "active",
				contractName: "Government Nonprofit Grant Agreement",
				contractType: "Grant_Agreement",
				department: "Administration",
				vendor: "State Health Agency",
			},
			"file:grant",
		);
		result.contractFileId = fileId;

		const contractRowId = demoRowId(orgId, "ctrgrant");
		result.grantContractId = await createRowIfMissing(
			contractsTable,
			contractRowId,
			{
				contractName: "Government Nonprofit Grant Agreement",
				contractNumber: `DEMO-GRANT-${orgId.slice(0, 6)}`,
				vendor: "State Health Agency",
				contractType: "Grant_Agreement",
				contractExpiryDate: new Date(
					Date.now() + 365 * 24 * 60 * 60 * 1000,
				).toISOString(),
				daysUntilExpiry: 365,
				compliance: "up-to-date",
				amount: 250000,
				currencyCode: "USD",
				priority: "High",
				department: "Administration",
				division: "c-suite",
				description: "Seeded demo grant agreement with attached sample PDF.",
				lifecycleStatus: "active",
				contractOwnerId: ownerUserId,
				assignedManagers: [ownerName],
				orgId,
				autoRenew: false,
				fileId: fileId ?? grantBucketId,
				startDate: new Date(
					Date.now() - 30 * 24 * 60 * 60 * 1000,
				).toISOString(),
			},
			"contract:grant",
		);
	}

	if (licenseBucketId) {
		const fileRowId = demoRowId(orgId, "filelic");
		const fileId = await createRowIfMissing(
			filesTable,
			fileRowId,
			{
				name: "Nonprofit_Residential_License_v2.pdf",
				url: constructFileUrl(licenseBucketId),
				bucketFileId: licenseBucketId,
				type: "document",
				extension: "pdf",
				size: licensePdf?.length ?? 0,
				accountId: ownerUserId,
				users: [ownerUserId],
				isContract: false,
				orgId,
				status: "active",
			},
			"file:license",
		);
		result.licenseFileId = fileId;

		const licenseRowId = demoRowId(orgId, "licres");
		result.residentialLicenseId = await createRowIfMissing(
			licensesTable,
			licenseRowId,
			{
				licenseName: "Nonprofit Residential License v2",
				licenseNumber: `NRL-DEMO-${orgId.slice(0, 6)}`,
				licenseType: "Healthcare",
				licenseExpiryDate: new Date(
					Date.now() + 200 * 24 * 60 * 60 * 1000,
				).toISOString(),
				issuingAuthority: "Dept. of Children & Families",
				issueDate: new Date(
					Date.now() - 165 * 24 * 60 * 60 * 1000,
				).toISOString(),
				status: "active",
				compliance: "compliant",
				division: "residential",
				assignedManagers: [ownerUserId.slice(0, 36)],
				orgId,
				currencyCode: "USD",
				fileId: (fileId ?? licenseBucketId).slice(0, 36),
				licenseUrl: constructFileUrl(licenseBucketId),
				daysUntilExpiry: 200,
				description: "Seeded residential facility license with sample PDF.",
			},
			"license:residential",
		);
	}

	// Extra library files (placeholder URLs — no Storage upload required)
	await createRowIfMissing(
		filesTable,
		demoRowId(orgId, "fileimg"),
		{
			name: "demo-facility.jpg",
			url: "https://picsum.photos/seed/caalm-demo/800/600.jpg",
			bucketFileId: `demo-img-${orgId.slice(0, 8)}`,
			type: "image",
			extension: "jpg",
			size: 512000,
			accountId: ownerUserId,
			users: [ownerUserId],
			isContract: false,
			orgId,
			status: "active",
		},
		"file:image",
	);

	return result;
}
