import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LicenseStatusPieChart from "@/components/LicenseStatusPieChart";
import type { License } from "@/types/licenses";

vi.mock("recharts", () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-container">{children}</div>
	),
	PieChart: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="pie-chart">{children}</div>
	),
	Pie: ({ data }: { data: Array<{ status: string; count: number }> }) => (
		<div data-testid="pie" data-count={data.length}>
			{data.map((item) => (
				<div
					key={item.status}
					data-status={item.status}
					data-count={item.count}
				/>
			))}
		</div>
	),
	Cell: ({ fill }: { fill: string }) => (
		<div data-testid="cell" data-fill={fill} />
	),
	Tooltip: () => <div data-testid="tooltip" />,
}));

function license(
	overrides: Partial<License> & { licenseExpiryDate: string; status: string },
): License {
	return {
		$id: overrides.$id || "lic-1",
		licenseName: overrides.licenseName || "Test License",
		licenseNumber: "LIC-1",
		licenseType: "business",
		licenseExpiryDate: overrides.licenseExpiryDate,
		issuingAuthority: "State",
		issueDate: "2024-01-01",
		status: overrides.status as License["status"],
		$createdAt: "",
		$updatedAt: "",
		...overrides,
	};
}

describe("LicenseStatusPieChart", () => {
	it("matches Contract Status layout: total, active chip, expiring/expired cards", () => {
		const licenses = [
			license({
				$id: "a",
				licenseExpiryDate: "2027-06-01",
				status: "active",
			}),
			license({
				$id: "b",
				licenseExpiryDate: new Date(Date.now() + 30 * 86400000)
					.toISOString()
					.slice(0, 10),
				status: "active",
			}),
			license({
				$id: "c",
				licenseExpiryDate: "2020-01-01",
				status: "expired",
			}),
		];

		render(<LicenseStatusPieChart licenses={licenses} />);

		expect(screen.getByText("License Status")).toBeInTheDocument();
		expect(screen.getByText("Total Licenses")).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText("Expiring")).toBeInTheDocument();
		expect(screen.getByText("Expired")).toBeInTheDocument();
		expect(screen.getByText("Live License Data")).toBeInTheDocument();

		const pie = screen.getByTestId("pie");
		expect(
			pie.querySelector('[data-status="active"]')?.getAttribute("data-count"),
		).toBe("1");
		expect(
			pie.querySelector('[data-status="expiring"]')?.getAttribute("data-count"),
		).toBe("1");
		expect(
			pie.querySelector('[data-status="expired"]')?.getAttribute("data-count"),
		).toBe("1");
	});

	it("renders empty zeros for an empty licenses list", () => {
		render(<LicenseStatusPieChart licenses={[]} />);
		const pie = screen.getByTestId("pie");
		expect(
			pie.querySelector('[data-status="active"]')?.getAttribute("data-count"),
		).toBe("0");
		expect(
			pie.querySelector('[data-status="expiring"]')?.getAttribute("data-count"),
		).toBe("0");
		expect(
			pie.querySelector('[data-status="expired"]')?.getAttribute("data-count"),
		).toBe("0");
	});
});
