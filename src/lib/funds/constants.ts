export const NET_ASSET_CLASSES = [
	"unrestricted",
	"temporarily_restricted",
	"permanently_restricted",
] as const;

export type NetAssetClass = (typeof NET_ASSET_CLASSES)[number];

export const DEFAULT_UNRESTRICTED_FUND_CODE = "UNRESTRICTED";

export function isNetAssetClass(value: unknown): value is NetAssetClass {
	return (
		typeof value === "string" &&
		(NET_ASSET_CLASSES as readonly string[]).includes(value)
	);
}
