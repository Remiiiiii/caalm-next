export type StoredNewsPriority = "high" | "medium" | "low";
export type DisplayNewsPriority = "high" | "normal";

/** Map DB high|medium|low onto the reader-facing high|normal labels. */
export function toDisplayPriority(
	priority: string | undefined | null,
): DisplayNewsPriority {
	return priority === "high" ? "high" : "normal";
}

/** Map editor high|normal onto the stored enum. Normal becomes medium. */
export function toStoredPriority(
	priority: string | undefined | null,
): StoredNewsPriority {
	if (priority === "high") return "high";
	if (priority === "low") return "low";
	if (priority === "medium") return "medium";
	return "medium";
}

export function prioritySortRank(priority: string | undefined | null): number {
	if (priority === "high") return 0;
	if (priority === "medium") return 1;
	return 2;
}
