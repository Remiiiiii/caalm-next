import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReadinessCharts } from "@/components/audits/ReadinessCharts";
import { ReadinessEvidenceMap } from "@/components/audits/readiness/ReadinessEvidenceMap";
import { ReadinessFixNextTable } from "@/components/audits/readiness/ReadinessFixNextTable";
import { ReadinessPublicSiteCard } from "@/components/audits/readiness/ReadinessPublicSiteCard";
import { ReadinessScoreCard } from "@/components/audits/readiness/ReadinessScoreCard";
import { ReadinessSnapshotHistory } from "@/components/audits/readiness/ReadinessSnapshotHistory";
import type {
	ReadinessDomain,
	ReadinessHistoryRow,
} from "@/components/audits/readiness/types";

const thresholds = { green: 85, amber: 70 };
const domains: ReadinessDomain[] = [
	{
		label: "Contracts & grants",
		readinessPercent: 0,
		ragStatus: "red",
		atRiskCount: 1,
	},
	{
		label: "Licenses",
		readinessPercent: 100,
		ragStatus: "green",
		atRiskCount: 0,
	},
];
const history: ReadinessHistoryRow[] = [
	{
		id: "s1",
		cadence: "weekly",
		score: 50,
		ragStatus: "red",
		createdAt: "2026-10-19T23:04:00.000Z",
		scoreDelta: null,
		source: "manual",
	},
];

describe("audit readiness components", () => {
	it("shows the score, a RAG word and a first-snapshot note", () => {
		render(
			<ReadinessScoreCard
				score={50}
				rag="red"
				thresholds={thresholds}
				domains={domains}
				sourcesUsed={["Contracts", "Licenses"]}
				deltaVsLast={null}
				onExplain={vi.fn()}
			/>,
		);
		expect(
			screen.getByRole("img", { name: /score 50% out of 100/i }),
		).toBeInTheDocument();
		expect(screen.getByText("Red")).toBeInTheDocument();
		expect(screen.getByText(/first snapshot/i)).toBeInTheDocument();
		const contractsRow = screen.getByRole("button", {
			name: /contracts & grants/i,
		});
		expect(within(contractsRow).getByText("0%")).toBeInTheDocument();
		expect(screen.queryByText("Not scored")).not.toBeInTheDocument();
	});

	it("labels an empty domain as not scored instead of 0%", () => {
		render(
			<ReadinessScoreCard
				score={100}
				rag="green"
				thresholds={thresholds}
				domains={domains}
				sourcesUsed={["Licenses"]}
				deltaVsLast={null}
				onExplain={vi.fn()}
			/>,
		);
		const contractsRow = screen.getByRole("button", {
			name: /contracts & grants/i,
		});
		const licensesRow = screen.getByRole("button", { name: /licenses/i });
		expect(within(contractsRow).getByText("Not scored")).toBeInTheDocument();
		expect(within(licensesRow).getByText("100%")).toBeInTheDocument();
	});

	it("renders Fix next as structured rows, not raw strings", () => {
		render(
			<ReadinessFixNextTable
				insights={[
					{
						id: "i1",
						title: "Gov contract",
						itemTitle: "Government Contract — Solvent Technologies, Inc.",
						itemKind: "contract",
						category: "Action required",
						owner: "Executive",
						dueDate: "2027-09-30T12:00:00.000+00:00",
						requirementTags: ["hrsa_osv", "financial_pbc"],
						description: "x",
						severity: "moderate",
						moduleLink: "/contracts",
						moduleLabel: "Contracts",
					},
				]}
			/>,
		);
		expect(screen.getByText("Moderate")).toBeInTheDocument();
		expect(screen.getByText("Sep 30, 2027")).toBeInTheDocument();
		expect(screen.getByText("HRSA OSV")).toBeInTheDocument();
		expect(screen.getByText("Financial PBC")).toBeInTheDocument();
		expect(screen.queryByText(/2027-09-30/)).not.toBeInTheDocument();
	});

	it("filters the evidence map by segment and counts coverage", async () => {
		render(
			<ReadinessEvidenceMap
				hits={[
					{
						requirementId: "A-1",
						label: "Alpha",
						auditType: "hrsa_osv",
						caalmModule: "contracts",
						status: "covered",
					},
					{
						requirementId: "B-1",
						label: "Beta",
						auditType: "cw_monitoring",
						caalmModule: "licenses",
						status: "gap",
						matchedRecords: [],
					},
					{
						requirementId: "CW-HOME-LICENSE",
						label: "Foster / group home or facility licensing",
						auditType: "cw_monitoring",
						caalmModule: "licenses",
						status: "covered",
						matchedRecords: [
							{
								id: "home-1",
								title: "Behavioral Health Facility License",
								href: "/licenses?highlight=home-1",
								status: "compliant",
							},
						],
					},
				]}
			/>,
		);
		expect(screen.getByText("2 of 3 covered")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("tab", { name: "CW monitoring" }));
		expect(screen.getByText("1 of 2 covered")).toBeInTheDocument();
		expect(
			within(screen.getByRole("table")).getByText("Gap"),
		).toBeInTheDocument();
		const segmentPills = within(screen.getByRole("table")).getAllByText(
			"CW monitoring",
		);
		expect(segmentPills.length).toBeGreaterThan(0);
		expect(segmentPills[0]).toHaveClass("whitespace-nowrap");
		expect(
			screen.getByText("Behavioral Health Facility License"),
		).toBeInTheDocument();
		expect(screen.getByText("No matching license")).toBeInTheDocument();
	});

	it("lists snapshots with change and source", () => {
		render(
			<ReadinessSnapshotHistory
				rows={history}
				timeZone="America/New_York"
				canExport={false}
				downloadingId={null}
				highlightId={null}
				onDownload={vi.fn()}
			/>,
		);
		expect(screen.getByText("— First snapshot")).toBeInTheDocument();
		expect(screen.getByText("Manual")).toBeInTheDocument();
		expect(screen.queryByText("PDF")).not.toBeInTheDocument();
	});

	it("labels an unscored domain instead of drawing a missing bar", () => {
		render(
			<ReadinessCharts
				domains={domains}
				sourcesUsed={["Licenses"]}
				severity={{ critical: 0, moderate: 1, low: 0 }}
				history={history}
				score={100}
				thresholds={thresholds}
			/>,
		);
		expect(screen.getByText("Not scored")).toBeInTheDocument();
		expect(screen.getByText(/1 snapshot so far/i)).toBeInTheDocument();
	});

	it("marks the public site as informational and readable", () => {
		render(
			<ReadinessPublicSiteCard
				siteCrawl={{
					websiteUrl: "https://example.org",
					crawledAt: "2026-10-20T12:00:00.000Z",
					healthHint: "needs_attention",
					issues: [],
					pages: [{ url: "https://example.org", status: 200, title: null }],
					robotsTxtFound: true,
					sitemapFound: false,
				}}
				org={{
					id: "o",
					name: "Org",
					timezone: "America/New_York",
					websiteUrl: "https://example.org",
				}}
				running={false}
				canManage={false}
				onReCrawl={() => {}}
				onHighlightEvidence={() => {}}
			/>,
		);
		expect(screen.getByText(/informational · not scored/i)).toBeInTheDocument();
		expect(screen.getByText("Needs attention")).toBeInTheDocument();
		expect(screen.queryByText("needs_attention")).not.toBeInTheDocument();
	});

	it("shows the contract's assigned manager and lets editors reassign it", async () => {
		const onAssign = vi.fn();
		const insight = {
			id: "c1",
			title: "Gov contract",
			itemKind: "contract",
			assignedManagers: ["acct-1"],
			description: "x",
			severity: "moderate" as const,
			moduleLink: "/contracts",
			moduleLabel: "Contracts",
		};
		const people = [
			{ id: "acct-1", name: "Pat Lee" },
			{ id: "acct-2", name: "Sam Roe" },
		];
		const pat = { $id: "u1", accountId: "acct-1", fullName: "Pat Lee" };
		const boss = { $id: "u9", accountId: "acct-9", fullName: "Dana Boss" };
		// Stored ids can be account ids or document ids; both resolve.
		const users = new Map([
			["acct-1", pat],
			["u1", pat],
			["acct-9", boss],
			["u9", boss],
		]);
		const { rerender } = render(
			<ReadinessFixNextTable
				insights={[{ ...insight, assignedBy: "u9" }]}
				users={users}
				people={people}
			/>,
		);
		expect(screen.getByText("Pat Lee")).toBeInTheDocument();
		expect(screen.getByText("Dana Boss")).toBeInTheDocument();
		expect(screen.getByText("Assigned by")).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /^open/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /assignee/i }),
		).not.toBeInTheDocument();

		rerender(
			<ReadinessFixNextTable
				insights={[insight]}
				users={users}
				canAssign={{ contract: true, license: false }}
				people={people}
				onAssign={onAssign}
			/>,
		);
		await userEvent.click(
			screen.getByRole("button", { name: /assignee pat lee/i }),
		);
		await userEvent.click(
			await screen.findByRole("menuitem", { name: /sam roe/i }),
		);
		expect(onAssign).toHaveBeenCalledWith(
			expect.objectContaining({ id: "c1" }),
			"acct-2",
		);
	});

	it("does not let a viewer without license edit reassign a license", () => {
		render(
			<ReadinessFixNextTable
				insights={[
					{
						id: "l1",
						title: "License",
						itemKind: "license",
						description: "x",
						severity: "low",
						moduleLink: "/licenses",
						moduleLabel: "Licenses",
					},
				]}
				canAssign={{ contract: true, license: false }}
				onAssign={vi.fn()}
			/>,
		);
		expect(screen.getByText("Unassigned")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /assign/i }),
		).not.toBeInTheDocument();
	});

	it("links every snapshot to its own preview and shows the next run", () => {
		render(
			<ReadinessSnapshotHistory
				rows={[
					...history,
					{ ...history[0], id: "s0", createdAt: "2026-10-12T23:04:00.000Z" },
				]}
				timeZone="America/New_York"
				nextRunLabel="Mon, Oct 26, 2026"
				canExport={false}
				downloadingId={null}
				highlightId={null}
				onDownload={vi.fn()}
			/>,
		);
		expect(screen.getByText(/Next run Mon, Oct 26, 2026/)).toBeInTheDocument();
		const links = screen.getAllByRole("link", { name: "Preview" });
		expect(links.map((link) => link.getAttribute("href"))).toEqual(
			expect.arrayContaining([
				"/audits/readiness/preview?snapshotId=s1",
				"/audits/readiness/preview?snapshotId=s0",
			]),
		);
	});

	it("puts Run weekly snapshot beside the cadence switch as a primary button", async () => {
		const onRun = vi.fn();
		render(
			<ReadinessSnapshotHistory
				rows={history}
				timeZone="America/New_York"
				canExport={false}
				downloadingId={null}
				highlightId={null}
				onDownload={vi.fn()}
				onRun={onRun}
			/>,
		);
		const run = screen.getByRole("button", { name: /run weekly snapshot/i });
		expect(run).toHaveClass("btn-primary");
		await userEvent.click(run);
		expect(onRun).toHaveBeenCalled();
	});

	it("shows profile photos for the assigned and assigning people", () => {
		const pat = {
			$id: "u1",
			accountId: "acct-1",
			fullName: "Pat Lee",
			imageUrl: "https://img.test/pat.png",
		};
		const boss = {
			$id: "u9",
			accountId: "acct-9",
			fullName: "Dana Boss",
			imageUrl: "https://img.test/dana.png",
		};
		const users = new Map([
			["u1", pat],
			["acct-1", pat],
			["u9", boss],
		]);
		const insight = {
			id: "c1",
			title: "Gov contract",
			itemKind: "contract",
			assignedManagers: ["u1"],
			assignedBy: "u9",
			description: "x",
			severity: "moderate" as const,
			moduleLink: "/contracts",
			moduleLabel: "Contracts",
		};
		const { container, rerender } = render(
			<ReadinessFixNextTable insights={[insight]} users={users} />,
		);
		const srcs = () =>
			Array.from(container.querySelectorAll("img")).map((img) =>
				img.getAttribute("src"),
			);
		expect(srcs()).toEqual(
			expect.arrayContaining([pat.imageUrl, boss.imageUrl]),
		);

		// Editable picker: the current assignee's photo comes from the resolved user,
		// even when the directory list has not loaded.
		rerender(
			<ReadinessFixNextTable
				insights={[insight]}
				users={users}
				canAssign={{ contract: true, license: false }}
				onAssign={vi.fn()}
			/>,
		);
		expect(srcs()).toEqual(
			expect.arrayContaining([pat.imageUrl, boss.imageUrl]),
		);
	});

	it("renders the assigned-by photo at the same size as the assigned-to photo", () => {
		const pat = {
			$id: "u1",
			accountId: "acct-1",
			fullName: "Pat Lee",
			imageUrl: "https://img.test/pat.png",
		};
		const boss = {
			$id: "u9",
			accountId: "acct-9",
			fullName: "Dana Boss",
			imageUrl: "https://img.test/dana.png",
		};
		const users = new Map([
			["u1", pat],
			["acct-1", pat],
			["u9", boss],
		]);
		const insight = {
			id: "c1",
			title: "Gov contract",
			itemKind: "contract",
			assignedManagers: ["u1"],
			assignedBy: "u9",
			description: "x",
			severity: "moderate" as const,
			moduleLink: "/contracts",
			moduleLabel: "Contracts",
		};
		const sizeOf = (container: HTMLElement, src: string) =>
			container.querySelector(`img[src="${src}"]`)?.parentElement?.className;

		// Editable: assigned-to comes from the picker, the source of truth.
		const editable = render(
			<ReadinessFixNextTable
				insights={[insight]}
				users={users}
				canAssign={{ contract: true, license: false }}
				onAssign={vi.fn()}
			/>,
		);
		const pickerSize = sizeOf(editable.container, pat.imageUrl);
		expect(pickerSize).toContain("w-8");
		expect(sizeOf(editable.container, boss.imageUrl)).toBe(pickerSize);
		editable.unmount();

		// Read-only: both cells use the same size as well.
		const readOnly = render(
			<ReadinessFixNextTable insights={[insight]} users={users} />,
		);
		expect(sizeOf(readOnly.container, pat.imageUrl)).toBe(pickerSize);
		expect(sizeOf(readOnly.container, boss.imageUrl)).toBe(pickerSize);
	});
});
