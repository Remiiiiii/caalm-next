export type SignerColorWay = {
	accent: string;
	fill: string;
	fillSelected: string;
	border: string;
	text: string;
};

/** Distinct color-ways so each signer’s fields are easy to tell apart. */
export const SIGNER_COLOR_WAYS: SignerColorWay[] = [
	{
		accent: "#0f5384",
		fill: "rgba(15, 83, 132, 0.12)",
		fillSelected: "rgba(15, 83, 132, 0.22)",
		border: "#0f5384",
		text: "#0f5384",
	},
	{
		accent: "#00c1cb",
		fill: "rgba(0, 193, 203, 0.16)",
		fillSelected: "rgba(0, 193, 203, 0.28)",
		border: "#0891a0",
		text: "#0a6b72",
	},
	{
		accent: "#c45c26",
		fill: "rgba(196, 92, 38, 0.14)",
		fillSelected: "rgba(196, 92, 38, 0.24)",
		border: "#c45c26",
		text: "#9a3412",
	},
	{
		accent: "#2f6b4f",
		fill: "rgba(47, 107, 79, 0.14)",
		fillSelected: "rgba(47, 107, 79, 0.24)",
		border: "#2f6b4f",
		text: "#1f4d38",
	},
	{
		accent: "#b45309",
		fill: "rgba(180, 83, 9, 0.14)",
		fillSelected: "rgba(180, 83, 9, 0.24)",
		border: "#b45309",
		text: "#9a3412",
	},
	{
		accent: "#475569",
		fill: "rgba(71, 85, 105, 0.14)",
		fillSelected: "rgba(71, 85, 105, 0.24)",
		border: "#475569",
		text: "#334155",
	},
];

export function getSignerColorWay(
	recipientId: string,
	recipients: Array<{ id: string }>,
): SignerColorWay {
	const index = recipients.findIndex((row) => row.id === recipientId);
	const safeIndex = index >= 0 ? index : 0;
	return SIGNER_COLOR_WAYS[safeIndex % SIGNER_COLOR_WAYS.length];
}
