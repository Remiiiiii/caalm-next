import type { RoadmapSectionOverview } from "@/lib/roadmap/types";

export type PrLogSection = RoadmapSectionOverview & {
	headRef: string;
	htmlUrl: string;
	draft: boolean;
	prNumber: number;
};

export type PrLogOverview = {
	overallProgressPercent: number;
	sections: PrLogSection[];
};

export type PrLogPullRequestDetail = {
	number: number;
	title: string;
	state: string;
	htmlUrl: string;
	headRef: string;
	body: string;
};
