import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditsSectionNav } from "@/components/audits/AuditsSectionNav";

const push = vi.fn();
let pathname = "/audits/readiness";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push, prefetch: vi.fn() }),
	usePathname: () => pathname,
}));

describe("AuditsSectionNav", () => {
	beforeEach(() => push.mockClear());

	it("marks the tab for the current route as selected", () => {
		pathname = "/audits/status";
		render(<AuditsSectionNav />);
		expect(
			screen.getByRole("tab", { name: "Compliance status" }),
		).toHaveAttribute("aria-selected", "true");
		expect(screen.getByRole("tab", { name: "Readiness" })).toHaveAttribute(
			"aria-selected",
			"false",
		);
	});

	it("navigates when another tab is chosen", async () => {
		pathname = "/audits/readiness";
		render(<AuditsSectionNav />);
		await userEvent.click(screen.getByRole("tab", { name: "Audit logs" }));
		expect(push).toHaveBeenCalledWith("/audits/audit");
	});

	it("hides the layout copy on the Readiness route", () => {
		pathname = "/audits/readiness";
		const { container } = render(<AuditsSectionNav hideOnReadiness />);
		expect(container).toBeEmptyDOMElement();
	});
});
