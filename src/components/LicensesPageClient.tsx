"use client";

import useSWR from "swr";
import Image from "next/image";
import LicensesAttentionStrip from "@/components/LicensesAttentionStrip";
import LicensesControlBar from "@/components/LicensesControlBar";
import LicensesHeaderActions from "@/components/LicensesHeaderActions";
import LicensesMetricsBar from "@/components/LicensesMetricsBar";
import { LicensesViewProvider } from "@/components/LicensesView";
import LicensesViewClient from "@/components/LicensesViewClient";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { fetcher } from "@/lib/swr-config";
import type { License } from "@/types/licenses";

const PAGE_SIZE = 12;

interface LicensesPageClientProps {
	user: { role?: string } | null;
	initialLicenses: License[];
	initialTotal: number;
}

interface MetricsResponse {
	data?: {
		metricsLicenses?: License[];
		filterOptions?: {
			departments: string[];
			assignedManagers: string[];
		};
		total?: number;
	};
}

export default function LicensesPageClient({
	user,
	initialLicenses,
	initialTotal,
}: LicensesPageClientProps) {
	const { data: metricsData } = useSWR<MetricsResponse>(
		"/api/licenses/metrics",
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 60000 },
	);

	const metricsLicenses =
		metricsData?.data?.metricsLicenses ??
		(initialLicenses.length ? initialLicenses : []);
	const filterOptions = metricsData?.data?.filterOptions ?? {
		departments: Array.from(
			new Set(
				initialLicenses
					.map((l) => l.division || l.department)
					.filter((d): d is string => !!d),
			),
		).sort(),
		assignedManagers: Array.from(
			new Set(
				initialLicenses
					.flatMap((l) => l.assignedManagers || [])
					.filter((m): m is string => !!m),
			),
		).sort(),
	};

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<LicensesViewProvider>
				<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
					<h1 className="h1 capitalize sidebar-gradient-text">Licenses</h1>
				</div>
				<div className="mb-6 flex items-center justify-end">
					<LicensesHeaderActions licenses={metricsLicenses} />
				</div>

				<LicensesAttentionStrip licenses={metricsLicenses} />
				<LicensesMetricsBar licenses={metricsLicenses} />

				<GlassCard className="glass-card mb-6">
					<div className="glass-card-cap" />
					<CardContent className="p-0">
						<LicensesControlBar
							licenses={metricsLicenses}
							departments={filterOptions.departments}
							assignedManagers={filterOptions.assignedManagers}
						/>
						{initialTotal > 0 || metricsLicenses.length > 0 ? (
							<LicensesViewClient
								user={user}
								initialLicenses={initialLicenses}
								totalCount={
									metricsData?.data?.total ?? initialTotal ?? initialLicenses.length
								}
								pageSize={PAGE_SIZE}
							/>
						) : (
							<div className="flex flex-col items-center justify-center text-center py-12 px-4">
								<Image
									src="/assets/icons/no-data.svg"
									alt="No licenses found"
									width={250}
									height={250}
									className="mb-4 opacity-60 mx-auto"
								/>
								<p className="body-1 text-slate-700">No licenses found</p>
							</div>
						)}
					</CardContent>
				</GlassCard>
			</LicensesViewProvider>
		</div>
	);
}
