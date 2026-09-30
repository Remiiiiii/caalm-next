import { CONTRACT_TYPE_CONFIGS } from "@/lib/contracts/contractTypeConfigs";
import type { BlueprintAccent } from "@/lib/templates/blueprint-accents";

const TYPE_ACCENTS: Record<string, BlueprintAccent> = {
	vendor: {
		badge: "bg-blue/10 text-blue border-blue/20",
		bar: "bg-blue",
		tag: "Vendor",
	},
	grant: {
		badge: "bg-green/10 text-green border-green/20",
		bar: "bg-green",
		tag: "Grant",
	},
	government: {
		badge: "bg-navy/10 text-navy border-navy/20",
		bar: "bg-navy",
		tag: "Government",
	},
	lease: {
		badge: "bg-orange/10 text-orange border-orange/20",
		bar: "bg-orange",
		tag: "Lease",
	},
	consulting: {
		badge: "bg-pink/10 text-pink border-pink/20",
		bar: "bg-pink",
		tag: "Consulting",
	},
	mou: {
		badge: "bg-blue/10 text-blue border-blue/20",
		bar: "bg-blue",
		tag: "MOU",
	},
	donation: {
		badge: "bg-coral-500/10 text-coral-500 border-coral-500/20",
		bar: "bg-coral-500",
		tag: "Donation",
	},
	independent_contractor: {
		badge: "bg-orange/10 text-orange border-orange/20",
		bar: "bg-orange",
		tag: "Contractor",
	},
	fiscal_sponsorship: {
		badge: "bg-green/10 text-green border-green/20",
		bar: "bg-green",
		tag: "Sponsorship",
	},
	employment: {
		badge: "bg-navy/10 text-navy border-navy/20",
		bar: "bg-navy",
		tag: "Employment",
	},
};

export function contractTypeAccent(contractType: string): BlueprintAccent {
	const fromMap = TYPE_ACCENTS[contractType];
	if (fromMap) return fromMap;
	const label =
		CONTRACT_TYPE_CONFIGS.find((row) => row.id === contractType)?.label ||
		contractType;
	return {
		badge: "bg-slate-100 text-slate-600 border-slate-200",
		bar: "bg-slate-400",
		tag: label.split(" ")[0] || "Agreement",
	};
}
