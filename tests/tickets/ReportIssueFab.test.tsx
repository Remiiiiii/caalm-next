import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildReportIssueFullFormHref,
	canQuickSubmitReportIssue,
	shouldCloseReportIssuePanel,
} from "@/lib/tickets/report-issue-submit";

const push = vi.fn();
const fetchMock = vi.mocked(global.fetch);

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push,
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	}),
	usePathname: () => "/contracts",
	useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/usePermissions", () => ({
	usePermissions: () => ({
		permissions: ["tickets.create"],
		loading: false,
	}),
}));

vi.mock("@/hooks/useFullWindowOverlayOpen", () => ({
	useFullWindowOverlayOpen: () => false,
}));

vi.mock("@/components/landing/ShimmerBadge", () => ({
	default: ({
		children,
		onClick,
		...props
	}: {
		children: string | number | boolean | null;
		onClick?: () => void;
		"aria-label"?: string;
	}) => (
		<button type="button" onClick={onClick} aria-label={props["aria-label"]}>
			{children}
		</button>
	),
}));

describe("report issue submit routing", () => {
	it("sends engineering reports to the full GitHub-style form", () => {
		expect(canQuickSubmitReportIssue("engineering")).toBe(false);
		expect(
			buildReportIssueFullFormHref({
				lane: "engineering",
				title: "Save does nothing on contracts",
				category: "Software / Application",
				affectedModule: "Contract Workflows",
			}),
		).toBe(
			"/tickets/new?lane=engineering&title=Save+does+nothing+on+contracts&category=Software+%2F+Application&module=Contract+Workflows",
		);
	});

	it("lets help tickets quick-submit from the FAB", () => {
		expect(canQuickSubmitReportIssue("help")).toBe(true);
	});

	it("does not close the panel when clicking a Radix select option", () => {
		const panel = document.createElement("div");
		const wrapper = document.createElement("div");
		wrapper.setAttribute("data-radix-popper-content-wrapper", "");
		const listbox = document.createElement("div");
		listbox.setAttribute("role", "listbox");
		const option = document.createElement("div");
		option.setAttribute("role", "option");
		listbox.appendChild(option);
		wrapper.appendChild(listbox);
		document.body.append(panel, wrapper);

		expect(shouldCloseReportIssuePanel(option, panel)).toBe(false);
		expect(
			shouldCloseReportIssuePanel(document.createElement("div"), panel),
		).toBe(true);
		expect(shouldCloseReportIssuePanel(panel, panel)).toBe(false);
	});
});

describe("ReportIssueFab", () => {
	beforeEach(() => {
		push.mockClear();
		fetchMock.mockClear();
	});

	it("shows Continue for engineering instead of posting", async () => {
		const { default: ReportIssueFab } = await import(
			"@/components/tickets/ReportIssueFab"
		);
		const user = userEvent.setup();
		render(<ReportIssueFab />);

		await user.click(screen.getByRole("button", { name: /report an issue/i }));
		await user.click(
			screen.getByRole("button", { name: /something is broken/i }),
		);

		expect(
			screen.getByRole("button", { name: /continue/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^submit$/i }),
		).not.toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("enables Continue after title when engineering auto-selects its only category", async () => {
		const { default: ReportIssueFab } = await import(
			"@/components/tickets/ReportIssueFab"
		);
		const user = userEvent.setup();
		render(<ReportIssueFab />);

		await user.click(screen.getByRole("button", { name: /report an issue/i }));
		await user.click(
			screen.getByRole("button", { name: /something is broken/i }),
		);
		const continueButton = screen.getByRole("button", { name: /continue/i });
		expect(continueButton).toBeDisabled();

		await user.type(
			screen.getByLabelText(/title/i),
			"Save does nothing on contracts",
		);

		expect(continueButton).toBeEnabled();
		expect(screen.getByRole("combobox")).toHaveTextContent(
			"Software / Application",
		);
	});

	it("shows Submit for help tickets", async () => {
		const { default: ReportIssueFab } = await import(
			"@/components/tickets/ReportIssueFab"
		);
		const user = userEvent.setup();
		render(<ReportIssueFab />);

		await user.click(screen.getByRole("button", { name: /report an issue/i }));
		await user.click(screen.getByRole("button", { name: /i need help/i }));

		expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /continue/i }),
		).not.toBeInTheDocument();
	});
});
