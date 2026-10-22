import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadinessSkeleton } from "@/components/audits/readiness/ReadinessSkeleton";
import {
	GlassCardSkeleton,
	MetricCardSkeleton,
} from "@/components/ui/glass-skeletons";

describe("glass skeletons", () => {
	it("renders the real card shell with inner placeholders, not one blank block", () => {
		const { container } = render(<MetricCardSkeleton rows={3} bar />);
		const card = container.querySelector(".glass-card");
		expect(card).toBeInTheDocument();
		expect(card?.querySelector(".glass-card-cap")).toBeInTheDocument();
		// icon, title, value, description, bar and three rows
		expect(
			card?.querySelectorAll(".animate-pulse").length,
		).toBeGreaterThanOrEqual(8);
	});

	it("GlassCardSkeleton shows a title and sub-label placeholder", () => {
		const { container } = render(<GlassCardSkeleton />);
		expect(container.querySelectorAll(".animate-pulse").length).toBe(2);
	});

	it("the Audit Readiness skeleton mirrors every section as its own card", () => {
		const { container } = render(<ReadinessSkeleton />);
		expect(
			screen.getByRole("status", { name: /loading readiness/i }),
		).toBeInTheDocument();
		const cards = container.querySelectorAll(".glass-card");
		// score + 3 metrics + fix next + assistant + 3 charts + evidence + site + history
		expect(cards.length).toBe(12);
		for (const card of cards) {
			expect(
				card.querySelectorAll(".animate-pulse").length,
			).toBeGreaterThanOrEqual(3);
		}
	});
});
