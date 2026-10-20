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
			screen.getByRole("img", { name: /score 50 out of 100/i }),
		).toBeInTheDocument();
		expect(screen.getByText("Red")).toBeInTheDocument();
		expect(screen.getByText(/first snapshot/i)).toBeInTheDocument();
		expect(screen.getByText("Contracts & grants")).toBeInTheDocument();
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
					},
				]}
			/>,
		);
		expect(screen.getByText("1 of 2 covered")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("tab", { name: "CW monitoring" }));
		expect(screen.getByText("0 of 1 covered")).toBeInTheDocument();
		expect(
			within(screen.getByRole("table")).getByText("Gap"),
		).toBeInTheDocument();
	});

	it("lists snapshots with change and source", () => {
		render(
			<ReadinessSnapshotHistory
				rows={history}
				latestId="s1"
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
					websiteUrl: null,
				}}
			/>,
		);
		expect(screen.getByText(/informational · not scored/i)).toBeInTheDocument();
		expect(screen.getByText("Needs attention")).toBeInTheDocument();
		expect(screen.queryByText("needs_attention")).not.toBeInTheDocument();
	});
});
