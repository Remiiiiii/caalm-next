import type { DonationPageConfigActor } from "./types";

type UserLike = {
	$id: string;
	fullName?: string | null;
	name?: string | null;
	email?: string | null;
};

/** Display name for version history / audit — prefer users.fullName over Auth name. */
export function donationPageConfigActorFromUser(
	user: UserLike,
): DonationPageConfigActor {
	const fullName =
		typeof user.fullName === "string" ? user.fullName.trim() : "";
	const name = typeof user.name === "string" ? user.name.trim() : "";
	const email = typeof user.email === "string" ? user.email.trim() : "";
	return {
		userId: user.$id,
		userName: fullName || name || email || "Unknown",
		userEmail: email,
	};
}

export function needsPublisherNameLookup(publishedByName: string): boolean {
	const trimmed = publishedByName.trim();
	return !trimmed || trimmed.toLowerCase() === "unknown";
}
