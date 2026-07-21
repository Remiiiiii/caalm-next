/**
 * Component tests for licenses UI: LicensesView, LicensesViewClient, LicensesTopControls, LicensesFilter
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LicensesAttentionStrip from "@/components/LicensesAttentionStrip";
import LicensesFilter from "@/components/LicensesFilter";
import LicensesMetricsBar from "@/components/LicensesMetricsBar";
import LicensesStatusTabs from "@/components/LicensesStatusTabs";
import LicensesTopControls from "@/components/LicensesTopControls";
import LicensesView, {
	LicensesViewProvider,
	useLicensesView,
} from "@/components/LicensesView";
import LicensesViewClient from "@/components/LicensesViewClient";
import type { License } from "@/types/licenses";

function createLicense(overrides: Partial<License> = {}): License {
	return {
		$id: overrides.$id ?? `lic-${Math.random().toString(36).slice(2, 9)}`,
		$createdAt: "2024-01-01T00:00:00.000Z",
		$updatedAt: "2024-01-01T00:00:00.000Z",
		licenseName: "Test License",
		licenseNumber: "LN-001",
		licenseType: "subscription",
		licenseExpiryDate: "2025-12-31",
		issuingAuthority: "Test Authority",
		issueDate: "2024-01-01",
		status: "active",
		orgId: "org-1",
		...overrides,
	};
}

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => "/licenses",
}));

vi.mock("react-countup", () => ({
	default: ({ end }: { end: number }) => <span>{end}</span>,
}));

vi.mock("@/components/licenses/LicenseCard", () => ({
	default: ({ license }: { license: License }) => (
		<div data-testid="license-card">{license.licenseName}</div>
	),
}));

vi.mock("@/components/LicensesTableView", () => ({
	default: ({ licenses }: { licenses: License[] }) => (
		<div data-testid="licenses-table">
			{licenses.map((l) => (
				<div key={l.$id} data-testid="table-row">
					{l.licenseName}
				</div>
			))}
		</div>
	),
}));

vi.mock("@/components/LicensesPagination", () => ({
	default: () => <div data-testid="licenses-pagination">Pagination</div>,
}));

vi.mock("@/components/Sort", () => ({
	default: () => <div data-testid="sort">Sort</div>,
}));

describe("LicensesView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("shows empty state when licenses array is empty", () => {
		render(
			<LicensesViewProvider>
				<LicensesView licenses={[]} user={{}} onRefresh={() => {}} />
			</LicensesViewProvider>,
		);
		expect(screen.getByText("No licenses found")).toBeInTheDocument();
		expect(screen.queryByTestId("license-card")).not.toBeInTheDocument();
	});

	it("renders license table by default when licenses are provided", () => {
		const licenses = [
			createLicense({ $id: "1", licenseName: "Adobe CC" }),
			createLicense({ $id: "2", licenseName: "Microsoft 365" }),
		];
		render(
			<LicensesViewProvider>
				<LicensesView licenses={licenses} user={{}} onRefresh={() => {}} />
			</LicensesViewProvider>,
		);
		expect(screen.getByTestId("licenses-table")).toBeInTheDocument();
		expect(screen.getByText("Adobe CC")).toBeInTheDocument();
		expect(screen.getByText("Microsoft 365")).toBeInTheDocument();
	});
});

describe("LicensesViewClient", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("shows empty state when licenses prop is empty", () => {
		render(
			<LicensesViewProvider>
				<LicensesViewClient licenses={[]} user={{}} />
			</LicensesViewProvider>,
		);
		expect(screen.getByText("No licenses found")).toBeInTheDocument();
	});

	it("shows license list when licenses are provided", () => {
		const licenses = [
			createLicense({ $id: "1", licenseName: "License One" }),
			createLicense({ $id: "2", licenseName: "License Two" }),
		];
		render(
			<LicensesViewProvider>
				<LicensesViewClient licenses={licenses} user={{}} />
			</LicensesViewProvider>,
		);
		expect(screen.getByText("License One")).toBeInTheDocument();
		expect(screen.getByText("License Two")).toBeInTheDocument();
	});

	it("filters by status tab when set in context", async () => {
		const licenses = [
			createLicense({
				$id: "1",
				licenseName: "Active License",
				status: "active",
			}),
			createLicense({
				$id: "2",
				licenseName: "Pending License",
				status: "pending-review",
			}),
		];

		function SetPendingTab() {
			const { setStatusTab } = useLicensesView();
			return (
				<button type="button" onClick={() => setStatusTab("pending")}>
					Set pending
				</button>
			);
		}

		const user = (await import("@testing-library/user-event")).default.setup();
		render(
			<LicensesViewProvider>
				<SetPendingTab />
				<LicensesViewClient licenses={licenses} user={{}} />
			</LicensesViewProvider>,
		);

		await user.click(screen.getByRole("button", { name: "Set pending" }));
		expect(screen.getByText("Pending License")).toBeInTheDocument();
		expect(screen.queryByText("Active License")).not.toBeInTheDocument();
	});
});

describe("LicensesTopControls", () => {
	it("search input has aria-label for accessibility", () => {
		render(
			<LicensesViewProvider>
				<LicensesTopControls licenses={[]} />
			</LicensesViewProvider>,
		);
		const searchInput = screen.getByRole("textbox", {
			name: /search licenses/i,
		});
		expect(searchInput).toBeInTheDocument();
		expect(searchInput).toHaveAttribute("aria-label", "Search licenses");
	});
});

describe("LicensesStatusTabs", () => {
	it("shows pending count for pending-review and suspended", () => {
		const licenses = [
			createLicense({ $id: "1", status: "pending-review" }),
			createLicense({ $id: "2", status: "suspended" }),
			createLicense({ $id: "3", status: "active" }),
		];
		render(
			<LicensesViewProvider>
				<LicensesStatusTabs licenses={licenses} />
			</LicensesViewProvider>,
		);
		const pendingTab = screen.getByRole("tab", { name: /Pending/i });
		expect(pendingTab).toHaveTextContent("2");
	});
});

describe("LicensesAttentionStrip", () => {
	it("appears when action-required licenses exist", () => {
		const licenses = [createLicense({ $id: "1", status: "action-required" })];
		render(
			<LicensesViewProvider>
				<LicensesAttentionStrip licenses={licenses} />
			</LicensesViewProvider>,
		);
		expect(screen.getByText("Needs attention")).toBeInTheDocument();
		expect(screen.getByText(/1 action required/)).toBeInTheDocument();
	});

	it("hides when nothing needs attention", () => {
		const licenses = [createLicense({ $id: "1", status: "active" })];
		const { container } = render(
			<LicensesViewProvider>
				<LicensesAttentionStrip licenses={licenses} />
			</LicensesViewProvider>,
		);
		expect(container).toBeEmptyDOMElement();
	});
});

describe("LicensesMetricsBar", () => {
	it("renders tier 1 cards from license metrics", () => {
		const licenses = [
			createLicense({
				$id: "1",
				status: "active",
				cost: 1000,
				quantity: 10,
				availableQuantity: 4,
			}),
			createLicense({
				$id: "2",
				status: "active",
				cost: 500,
				compliance: "at-risk",
			}),
		];
		render(
			<LicensesViewProvider>
				<LicensesMetricsBar licenses={licenses} />
			</LicensesViewProvider>,
		);
		expect(screen.getByText("Total Licenses")).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText("Total Cost")).toBeInTheDocument();
		expect(screen.getByText("Seat utilization")).toBeInTheDocument();
		expect(screen.getByText("Compliance at risk")).toBeInTheDocument();
	});
});

describe("LicensesFilter", () => {
	it('Filter button has aria-label "Filter" when no filters are active', () => {
		render(
			<LicensesViewProvider>
				<LicensesFilter departments={[]} assignedManagers={[]} />
			</LicensesViewProvider>,
		);
		const filterButton = screen.getByRole("button", { name: "Filter" });
		expect(filterButton).toBeInTheDocument();
		expect(filterButton).toHaveAttribute("aria-label", "Filter");
	});

	it("Filter sheet shows Filter licenses header when opened", async () => {
		const user = (await import("@testing-library/user-event")).default.setup();
		render(
			<LicensesViewProvider>
				<LicensesFilter departments={[]} assignedManagers={[]} />
			</LicensesViewProvider>,
		);
		await user.click(screen.getByRole("button", { name: "Filter" }));
		expect(screen.getByText("Filter licenses")).toBeInTheDocument();
		expect(screen.getByText("Refine your license list")).toBeInTheDocument();
	});
});
