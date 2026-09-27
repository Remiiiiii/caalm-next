import type { NextBestActionKind } from "./next-best-action";

const KINDS: NextBestActionKind[] = ["thank", "call", "invite", "ask"];

export function isNextBestActionKind(value: string): value is NextBestActionKind {
	return (KINDS as readonly string[]).includes(value);
}
