import type { NetAssetClass } from "@/lib/funds/constants";
import type { JournalRestrictionClass } from "./types";

export function restrictionClassFromNetAsset(
	netAssetClass: NetAssetClass,
): JournalRestrictionClass {
	return netAssetClass === "unrestricted" ? "unrestricted" : "restricted";
}
