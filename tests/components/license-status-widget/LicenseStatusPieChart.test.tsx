import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LicenseStatusPieChart from "@/components/LicenseStatusPieChart";
import type { License } from "@/types/licenses";

vi.mock("scichart", () => {
	class PieSegment {
		value: number;
		text: string;
		color: string;
		constructor(opts: { value: number; text: string; color: string }) {
			this.value = opts.value;
			this.text = opts.text;
			this.color = opts.color;
		}
	}

	class SciChartPieSurface {
		labelStyle = {};
		labelProvider = { precision: 2 };
		pieSegments = {
			add: (...segments: PieSegment[]) => {
				const host = document.querySelector(
					'[data-testid="license-status-donut"]',
				);
				if (!host) return;
				for (const seg of segments) {
					const el = document.createElement("div");
					el.setAttribute("data-status", seg.text);
					el.setAttribute("data-count", String(seg.value));
					el.setAttribute("data-testid", "pie-segment");
					host.appendChild(el);
				}
			},
		};
		delete = vi.fn();
		static create = vi.fn(async () => new SciChartPieSurface());
	}

	return {
		PieSegment,
		SciChartPieSurface,
		GradientParams: class {
			constructor(..._args: unknown[]) {}
		},
		Point: class {
			constructor(..._args: unknown[]) {}
		},
		EPieType: { Donut: "Donut", Pie: "Pie" },
		EPieValueMode: { Percentage: "Percentage", Raw: "Raw" },
		ESizingMode: { Relative: "Relative", Absolute: "Absolute" },
		Thickness: class {
			constructor(..._args: unknown[]) {}
		},
		SciChartJSLightTheme: class {
			sciChartBackground = "";
			loadingAnimationBackground = "";
		},
	};
});

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
	it("matches Contract Status layout: hero, tabs, list, live footer", async () => {
		const licenses = [
			license({
				$id: "a",
				licenseName: "Active License",
				licenseExpiryDate: "2027-06-01",
				status: "active",
			}),
			license({
				$id: "b",
				licenseName: "Expiring License",
				licenseExpiryDate: new Date(Date.now() + 30 * 86400000)
					.toISOString()
					.slice(0, 10),
				status: "active",
			}),
			license({
				$id: "c",
				licenseName: "Expired License",
				licenseExpiryDate: "2020-01-01",
				status: "expired",
			}),
		];

		render(<LicenseStatusPieChart licenses={licenses} />);

		expect(screen.getByText("License status")).toBeInTheDocument();
		expect(screen.getByText("total licenses")).toBeInTheDocument();
		expect(screen.getByLabelText("Open licenses")).toBeInTheDocument();
		expect(screen.getByText("2 of 3 need attention")).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText("Expiring")).toBeInTheDocument();
		expect(screen.getByText("Expired")).toBeInTheDocument();
		expect(screen.getByText("Live license data")).toBeInTheDocument();
		expect(screen.getByText("Active License")).toBeInTheDocument();
		expect(screen.queryByText(/\+ \d+ more/)).not.toBeInTheDocument();

		const segments = await screen.findAllByTestId("pie-segment");
		const byStatus = Object.fromEntries(
			segments.map((el) => [
				el.getAttribute("data-status"),
				el.getAttribute("data-count"),
			]),
		);
		expect(byStatus.active).toBe("1");
		expect(byStatus.expiring).toBe("1");
		expect(byStatus.expired).toBe("1");
	});

	it("shows the healthy pill when every license is active", () => {
		const licenses = [
			license({
				$id: "a",
				licenseExpiryDate: "2027-06-01",
				status: "active",
			}),
			license({
				$id: "b",
				licenseExpiryDate: "2028-01-01",
				status: "active",
			}),
		];

		render(<LicenseStatusPieChart licenses={licenses} />);

		expect(screen.getByText("All licenses healthy")).toBeInTheDocument();
		expect(screen.queryByText(/need attention/)).not.toBeInTheDocument();
	});

	it("renders empty zeros for an empty licenses list", async () => {
		render(<LicenseStatusPieChart licenses={[]} />);
		expect(screen.getByText("All licenses healthy")).toBeInTheDocument();
		expect(screen.getByTestId("license-status-donut")).toBeInTheDocument();
		const emptySeg = await screen.findByTestId("pie-segment");
		expect(emptySeg.getAttribute("data-status")).toBe("empty");
	});
});
