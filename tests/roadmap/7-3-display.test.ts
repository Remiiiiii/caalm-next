import { describe, expect, it } from "vitest";
import {
	formatNegotiationParagraphDisplay,
	renderNegotiationInlineText,
} from "@/lib/contracts/negotiation/display-text";

describe("negotiation display text", () => {
	it("strips markdown headings for plain snippets", () => {
		expect(formatNegotiationParagraphDisplay("# Test Grant Contract")).toBe(
			"Test Grant Contract",
		);
		expect(formatNegotiationParagraphDisplay("### Clause lineage")).toBe(
			"Clause lineage",
		);
		expect(formatNegotiationParagraphDisplay("**Bold** and more")).toBe(
			"Bold and more",
		);
	});

	it("keeps defined terms bold in inline render nodes", () => {
		const nodes = renderNegotiationInlineText(
			"The **Grantor** and **Grantee** agree.",
		);
		expect(nodes).toBeTruthy();
		const asArray = Array.isArray(nodes)
			? nodes
			: // Fragment children
				((nodes as { props?: { children?: unknown } }).props?.children ??
					nodes);
		const flat = Array.isArray(asArray) ? asArray : [asArray];
		const strong = flat.filter(
			(node) =>
				node &&
				typeof node === "object" &&
				"type" in node &&
				(node as { type: unknown }).type === "strong",
		);
		expect(strong).toHaveLength(2);
	});
});
