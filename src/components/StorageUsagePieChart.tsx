"use client";

import { Cell, Label, Pie, PieChart } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { convertFileSize } from "@/lib/utils";

const CATEGORY_COLORS = {
	Documents: "#0f5384",
	Images: "#03AFBF",
	Media: "#56B8FF",
	Others: "#7C3AED",
} as const;

/** Format % of quota so tiny usage (e.g. 2.5 MB / 10 GB) still shows as 0.024%, not 0%. */
function formatStorageUsedPercent(percent: number): string {
	if (!Number.isFinite(percent) || percent <= 0) return "0";
	if (percent >= 100) return "100";
	if (percent < 1) {
		const fixed = percent.toFixed(3);
		return fixed.replace(/\.?0+$/, "") || "0";
	}
	if (percent < 10) {
		return (Math.round(percent * 10) / 10).toString();
	}
	return Math.round(percent).toString();
}

export interface StorageUsageCategory {
	title: string;
	size: number;
}

interface StorageUsagePieChartProps {
	categories: StorageUsageCategory[];
	used: number;
	limitBytes: number;
	limitGB?: number;
}

export function StorageUsagePieChart({
	categories,
	used,
	limitBytes,
	limitGB,
}: StorageUsagePieChartProps) {
	const totalCategoryBytes = categories.reduce((sum, c) => sum + (c.size || 0), 0);
	const chartData = categories.map((category) => ({
		name: category.title,
		value: Math.max(category.size || 0, 0),
		fill:
			CATEGORY_COLORS[category.title as keyof typeof CATEGORY_COLORS] ||
			"#64748b",
	}));

	const freeBytes = Math.max(0, (limitBytes || 0) - (used || 0));
	const dataWithFree =
		totalCategoryBytes === 0
			? [{ name: "Available", value: Math.max(freeBytes, 1), fill: "#e2e8f0" }]
			: chartData;

	const chartConfig = dataWithFree.reduce((acc, item) => {
		acc[item.name] = { label: item.name, color: item.fill };
		return acc;
	}, {} as ChartConfig);

	const usedPercentRaw =
		limitBytes > 0 ? Math.min(100, (used / limitBytes) * 100) : 0;
	const usedPercentLabel = formatStorageUsedPercent(usedPercentRaw);
	const usedLabel = convertFileSize({ sizeInBytes: used }) || "0 Bytes";
	const limitLabel =
		limitGB !== undefined
			? `${limitGB} GB`
			: convertFileSize({ sizeInBytes: limitBytes }) || "—";

	return (
		<div className="flex w-full flex-col items-stretch gap-6 lg:flex-row lg:items-center">
			<ChartContainer
				config={chartConfig}
				className="mx-auto aspect-square h-[220px] w-full max-w-[220px]"
			>
				<PieChart>
					<ChartTooltip
						content={
							<ChartTooltipContent
								formatter={(value, name) => (
									<span className="flex items-center justify-between gap-4">
										<span>{name}</span>
										<span className="font-medium">
											{convertFileSize({
												sizeInBytes: Number(value) || 0,
											})}
										</span>
									</span>
								)}
							/>
						}
					/>
					<Pie
						data={dataWithFree}
						dataKey="value"
						nameKey="name"
						innerRadius={62}
						outerRadius={88}
						paddingAngle={totalCategoryBytes > 0 ? 3 : 0}
						strokeWidth={0}
					>
						{dataWithFree.map((entry) => (
							<Cell key={entry.name} fill={entry.fill} />
						))}
						<Label
							content={({ viewBox }) => {
								if (viewBox && "cx" in viewBox && "cy" in viewBox) {
									return (
										<text
											x={viewBox.cx}
											y={viewBox.cy}
											textAnchor="middle"
											dominantBaseline="middle"
										>
											<tspan
												x={viewBox.cx}
												y={(viewBox.cy || 0) - 8}
												className="fill-slate-800 text-2xl font-bold"
											>
												{usedPercentLabel}%
											</tspan>
											<tspan
												x={viewBox.cx}
												y={(viewBox.cy || 0) + 14}
												className="fill-slate-500 text-xs"
											>
												Space used
											</tspan>
										</text>
									);
								}
								return null;
							}}
						/>
					</Pie>
				</PieChart>
			</ChartContainer>

			<div className="min-w-0 flex-1 space-y-3">
				<div className="rounded-lg border border-slate-200 bg-white/70 px-4 py-3">
					<p className="text-xs font-medium text-slate-500">Available storage</p>
					<p className="text-sm font-semibold text-slate-800">
						{usedLabel} / {limitLabel}
					</p>
				</div>
				<ul className="space-y-2">
					{categories.map((category) => {
						const color =
							CATEGORY_COLORS[category.title as keyof typeof CATEGORY_COLORS] ||
							"#64748b";
						const pct =
							used > 0
								? Math.round(((category.size || 0) / used) * 1000) / 10
								: 0;
						return (
							<li
								key={category.title}
								className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white/60 px-3 py-2"
							>
								<div className="flex min-w-0 items-center gap-2">
									<span
										className="h-2.5 w-2.5 shrink-0 rounded-full"
										style={{ backgroundColor: color }}
									/>
									<span className="truncate text-sm font-medium text-slate-800">
										{category.title}
									</span>
								</div>
								<div className="shrink-0 text-right">
									<p className="text-sm font-semibold text-slate-800">
										{convertFileSize({ sizeInBytes: category.size || 0 })}
									</p>
									<p className="text-xs text-slate-500">{pct}%</p>
								</div>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
