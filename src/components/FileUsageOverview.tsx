"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import FormattedDateTime from "@/components/FormattedDateTime";
import { StorageUsagePieChart } from "@/components/StorageUsagePieChart";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import { convertFileSize, getUsageSummary } from "@/lib/utils";

const FileUsageOverview = () => {
	const { totalSpace, limitBytes, limitGB, isLoading } = useStorageUsage();

	if (isLoading && !totalSpace) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="flex flex-col p-4 sm:p-6">
					<h2 className="mb-6 text-lg font-bold sidebar-gradient-text">
						File Usage Overview
					</h2>
					<div className="flex items-center justify-center gap-2 py-8">
						<Loader2 className="h-6 w-6 animate-spin text-[#0f5384]" />
						<p className="text-slate-500">Loading usage data...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!totalSpace) {
		return null;
	}

	const summaries = getUsageSummary(totalSpace);

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div className="mb-6">
					<h2 className="text-lg font-bold sidebar-gradient-text">
						File Usage Overview
					</h2>
				</div>

				<div className="mb-6 rounded-xl border border-slate-200/80 bg-white/50 p-4 sm:p-5">
					<StorageUsagePieChart
						categories={summaries.map((s) => ({
							title: s.title,
							size: s.size,
						}))}
						used={totalSpace.used || 0}
						limitBytes={limitBytes ?? totalSpace.limitBytes}
						limitGB={limitGB ?? totalSpace.limitGB}
					/>
				</div>

				<ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{summaries.map((summary) => (
						<li key={summary.title}>
							<Link
								href={summary.url}
								className="glass-card-inner interactive-glass-card flex flex-col rounded-lg border border-slate-200/60 p-4 transition-all duration-200 hover:border-blue-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
							>
								<div className="mb-2 flex items-center justify-between">
									<Image
										src={summary.icon}
										width={40}
										height={40}
										alt={summary.title}
										className="rounded-full"
									/>
									<h4 className="text-lg font-semibold text-slate-800">
										{convertFileSize({ sizeInBytes: summary.size }) || 0}
									</h4>
								</div>
								<h5 className="mb-1 text-sm font-medium text-slate-700">
									{summary.title}
								</h5>
								<Separator className="my-2 bg-slate-200" />
								<FormattedDateTime
									date={summary.latestDate}
									className="text-left text-xs text-slate-500"
								/>
							</Link>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
};

export default FileUsageOverview;
