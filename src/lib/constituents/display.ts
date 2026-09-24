import type { Constituent, ConstituentType } from "./types";

export function constituentDisplayName(
	constituent: Pick<Constituent, "firstName" | "lastName">,
): string {
	return `${constituent.firstName} ${constituent.lastName}`.trim();
}

export function constituentTypeLabel(type: ConstituentType): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

export function constituentTypeBadgeClass(type: ConstituentType): string {
	if (type === "donor") return "bg-green/10 text-green border-green/20";
	if (type === "volunteer") return "bg-blue/10 text-blue border-blue/20";
	if (type === "member") return "bg-orange/10 text-orange border-orange/20";
	return "bg-slate-100 text-slate-600 border-slate-200";
}

export const CONSTITUENT_DNC_BADGE_CLASS =
	"bg-red/10 text-red border-red/20";
