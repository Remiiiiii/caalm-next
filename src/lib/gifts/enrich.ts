import {
	resolveFundForGift,
	UNRESTRICTED_DESIGNATION_LABEL,
} from "@/lib/designations";
import type { Gift } from "./types";

export type EnrichedGift = Gift & {
	designationLabel: string;
};

export async function enrichGift(gift: Gift): Promise<EnrichedGift> {
	const { designationLabel } = await resolveFundForGift(
		gift.orgId,
		gift.designationId,
	);
	return {
		...gift,
		designationLabel: gift.designationId
			? designationLabel
			: UNRESTRICTED_DESIGNATION_LABEL,
	};
}
