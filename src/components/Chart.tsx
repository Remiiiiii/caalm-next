"use client";

import {
	Label,
	PolarGrid,
	PolarRadiusAxis,
	RadialBar,
	RadialBarChart,
} from "recharts";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { calculatePercentage, convertFileSize } from "@/lib/utils";

const chartConfig = {
	size: {
		label: "Size",
	},
	used: {
		label: "Used",
		color: "white",
	},
} satisfies ChartConfig;

export const Chart = ({
	used = 0,
	limitBytes,
	limitGB,
}: {
	used: number;
	limitBytes?: number;
	limitGB?: number;
}) => {
	const resolvedLimitBytes =
		limitBytes ?? (limitGB ? limitGB * 1024 * 1024 * 1024 : undefined);
	const pct = calculatePercentage(used, resolvedLimitBytes);
	const chartData = [{ storage: "used", 10: used, fill: "white" }];
	const displayLimitGB =
		limitGB ??
		(resolvedLimitBytes
			? resolvedLimitBytes / (1024 * 1024 * 1024)
			: 2);

	return (
		<Card className="chart">
			<CardContent className="flex-1 p-0">
				<ChartContainer config={chartConfig} className="chart-container">
					<RadialBarChart
						data={chartData}
						startAngle={90}
						endAngle={Number(pct) + 90}
						innerRadius={80}
						outerRadius={110}
					>
						<PolarGrid
							gridType="circle"
							radialLines={false}
							stroke="none"
							className="polar-grid"
							polarRadius={[86, 74]}
						/>
						<RadialBar dataKey="storage" background cornerRadius={10} />
						<PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
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
													y={viewBox.cy}
													className="chart-total-percentage"
												>
													{used && pct
														? pct.toString().replace(/^0+/, "")
														: "0"}
													%
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 24}
													className="fill-white/70"
												>
													Space used
												</tspan>
											</text>
										);
									}
								}}
							/>
						</PolarRadiusAxis>
					</RadialBarChart>
				</ChartContainer>
			</CardContent>
			<CardHeader className="chart-details">
				<CardTitle className="chart-title">Available Storage</CardTitle>
				<CardDescription className="chart-description">
					{used ? convertFileSize({ sizeInBytes: used }) : "0 Bytes"} /{" "}
					{Number.isInteger(displayLimitGB)
						? displayLimitGB
						: displayLimitGB.toFixed(1)}
					GB
				</CardDescription>
			</CardHeader>
		</Card>
	);
};
