import { getContractTypeConfig } from "@/lib/contracts/contractTypeConfigs";
import type { BlueprintId } from "@/types/contract-templates";
import thumbnailHashes from "@/lib/templates/blueprint-thumbnail-hashes.json";

function thumbUrl(id: BlueprintId): string {
	const hash = thumbnailHashes[id]?.slice(0, 12) || "0";
	return `/assets/contract-blueprints/${id}.${hash}.w1.png`;
}

export const CONTRACT_BLUEPRINTS_BUCKET_ID = "69c8f503003c4d5e6f04";

export type BlueprintCatalogEntry = {
	id: BlueprintId;
	contractTypeId: string;
	label: string;
	description: string;
	fileName: string;
	sourceFileId: string;
	thumbnailFileId: string;
	thumbnailUrl: string;
};

export const CONTRACT_BLUEPRINTS: BlueprintCatalogEntry[] = [
	{
		id: "vendor",
		contractTypeId: "vendor",
		label: "Vendor/Service Agreement",
		description: "Service contracts with vendors and providers.",
		fileName: "01_Vendor_Service_Agreement.docx",
		sourceFileId: "bp01vendordocx",
		thumbnailFileId: "bp01vendorthumb",
		thumbnailUrl: thumbUrl("vendor"),
	},
	{
		id: "grant",
		contractTypeId: "grant",
		label: "Grant Agreement",
		description: "Grant funding terms with grantors and foundations.",
		fileName: "02_Grant_Agreement.docx",
		sourceFileId: "bp02grantdocx",
		thumbnailFileId: "bp02grantthumb",
		thumbnailUrl: thumbUrl("grant"),
	},
	{
		id: "government",
		contractTypeId: "government",
		label: "Government Contract",
		description: "Agency awards with FAR clause placeholders.",
		fileName: "03_Government_Contract.docx",
		sourceFileId: "bp03govdocx",
		thumbnailFileId: "bp03govthumb",
		thumbnailUrl: thumbUrl("government"),
	},
	{
		id: "lease",
		contractTypeId: "lease",
		label: "Lease Agreement",
		description: "Property and facility lease terms.",
		fileName: "04_Lease_Agreement.docx",
		sourceFileId: "bp04leasedocx",
		thumbnailFileId: "bp04leasethumb",
		thumbnailUrl: thumbUrl("lease"),
	},
	{
		id: "consulting",
		contractTypeId: "consulting",
		label: "Consulting Agreement",
		description: "Professional consulting and advisory work.",
		fileName: "05_Consulting_Agreement.docx",
		sourceFileId: "bp05consultdocx",
		thumbnailFileId: "bp05consultthumb",
		thumbnailUrl: thumbUrl("consulting"),
	},
	{
		id: "mou",
		contractTypeId: "mou",
		label: "Memorandum of Understanding",
		description: "Non-binding partnership language.",
		fileName: "06_Memorandum_of_Understanding.docx",
		sourceFileId: "bp06moudocx",
		thumbnailFileId: "bp06mouthumb",
		thumbnailUrl: thumbUrl("mou"),
	},
	{
		id: "donation",
		contractTypeId: "donation",
		label: "Donation/Gift Agreement",
		description: "Charitable gifts and donor restrictions.",
		fileName: "07_Donation_Gift_Agreement.docx",
		sourceFileId: "bp07donationdocx",
		thumbnailFileId: "bp07donationthumb",
		thumbnailUrl: thumbUrl("donation"),
	},
	{
		id: "independent_contractor",
		contractTypeId: "independent_contractor",
		label: "Independent Contractor Agreement",
		description: "Contractor scope, pay, and legal terms.",
		fileName: "08_Independent_Contractor_Agreement.docx",
		sourceFileId: "bp08icondocx",
		thumbnailFileId: "bp08iconthumb",
		thumbnailUrl: thumbUrl("independent_contractor"),
	},
	{
		id: "fiscal_sponsorship",
		contractTypeId: "fiscal_sponsorship",
		label: "Fiscal Sponsorship Agreement",
		description: "Sponsored project oversight and fees.",
		fileName: "09_Fiscal_Sponsorship_Agreement.docx",
		sourceFileId: "bp09fiscaldocx",
		thumbnailFileId: "bp09fiscalthumb",
		thumbnailUrl: thumbUrl("fiscal_sponsorship"),
	},
	{
		id: "employment",
		contractTypeId: "employment",
		label: "Employment Contract",
		description: "Role, pay, benefits, and employment terms.",
		fileName: "10_Employment_Contract.docx",
		sourceFileId: "bp10employdocx",
		thumbnailFileId: "bp10employthumb",
		thumbnailUrl: thumbUrl("employment"),
	},
];

export function isBlueprintId(value: unknown): value is BlueprintId {
	return (
		typeof value === "string" &&
		CONTRACT_BLUEPRINTS.some((row) => row.id === value)
	);
}

export function getBlueprint(id: string): BlueprintCatalogEntry | undefined {
	return CONTRACT_BLUEPRINTS.find((row) => row.id === id);
}

export function blueprintLabel(id: string | null | undefined): string {
	if (!id) return "Untitled draft";
	const row = getBlueprint(id);
	if (row) return row.label;
	const config = getContractTypeConfig(id);
	return config?.label || id;
}
