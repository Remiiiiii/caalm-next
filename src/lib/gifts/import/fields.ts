import { guessMappedField } from "@/lib/import/mapping";

export const GIFT_IMPORT_FIELD_KEYS = [
	"constituentEmail",
	"constituentId",
	"amount",
	"giftDate",
	"method",
	"campaignName",
	"fundCode",
	"contractNumber",
	"anonymous",
	"postAfterImport",
] as const;

export type GiftImportFieldKey = (typeof GIFT_IMPORT_FIELD_KEYS)[number];

export const GIFT_IMPORT_FIELD_LABELS: Record<GiftImportFieldKey, string> = {
	constituentEmail: "Constituent email",
	constituentId: "Constituent ID",
	amount: "Amount",
	giftDate: "Gift date",
	method: "Payment method",
	campaignName: "Campaign name",
	fundCode: "Fund code",
	contractNumber: "Grant contract number",
	anonymous: "Anonymous",
	postAfterImport: "Post after import",
};

const ALIASES: Record<string, GiftImportFieldKey> = {
	email: "constituentEmail",
	constituent_email: "constituentEmail",
	"constituent email": "constituentEmail",
	donor_email: "constituentEmail",
	constituentid: "constituentId",
	constituent_id: "constituentId",
	amount: "amount",
	gift_amount: "amount",
	giftdate: "giftDate",
	gift_date: "giftDate",
	date: "giftDate",
	method: "method",
	payment_method: "method",
	campaign: "campaignName",
	campaign_name: "campaignName",
	fund: "fundCode",
	fund_code: "fundCode",
	contract: "contractNumber",
	contract_number: "contractNumber",
	anonymous: "anonymous",
	post: "postAfterImport",
	post_after_import: "postAfterImport",
};

export function guessGiftImportField(header: string): GiftImportFieldKey | "" {
	return guessMappedField(header, GIFT_IMPORT_FIELD_KEYS, ALIASES);
}

export const GIFT_IMPORT_SAMPLE_CSV = `constituent_email,amount,gift_date,method,campaign_name,fund_code,anonymous,post_after_import
pat@example.org,250,2026-01-15,check,Annual appeal,UNRESTRICTED,false,true
`;
