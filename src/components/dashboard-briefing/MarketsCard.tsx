"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { YAHOO_FINANCE_MARKETS_URL, type MarketQuote } from "@/types/briefing";

function Sparkline({
	points,
	positive,
}: {
	points: number[];
	positive: boolean;
}) {
	if (points.length < 2) {
		return <div className="h-7 w-16 shrink-0" aria-hidden />;
	}

	const min = Math.min(...points);
	const max = Math.max(...points);
	const span = max - min || 1;
	const width = 64;
	const height = 28;
	const d = points
		.map((value, index) => {
			const x = (index / (points.length - 1)) * width;
			const y = height - ((value - min) / span) * height;
			return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
		})
		.join(" ");

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className={cn("shrink-0", positive ? "text-green" : "text-red")}
			aria-hidden
		>
			<path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	);
}

function formatPrice(price: number): string {
	return price.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function formatChange(changePercent: number): string {
	const sign = changePercent > 0 ? "+" : "";
	return `${sign}${changePercent.toFixed(2)}%`;
}

type MarketsCardProps = {
	markets: MarketQuote[];
	loading?: boolean;
};

export function MarketsCard({ markets, loading = false }: MarketsCardProps) {
	return (
		<Card className="glass-card overflow-hidden">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-5">
				<div className="mb-3 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TrendingUp className="h-4 w-4 text-green" />
						<h3 className="text-sm font-semibold text-slate-700">Markets</h3>
					</div>
				</div>

				{loading ? (
					<div className="space-y-3">
						{[1, 2, 3, 4, 5].map((row) => (
							<div key={row} className="flex items-center justify-between gap-3">
								<div className="space-y-1">
									<div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
									<div className="h-3 w-10 animate-pulse rounded bg-slate-200" />
								</div>
								<div className="h-7 w-16 animate-pulse rounded bg-slate-200" />
								<div className="space-y-1 text-right">
									<div className="ml-auto h-4 w-14 animate-pulse rounded bg-slate-200" />
									<div className="ml-auto h-3 w-16 animate-pulse rounded bg-slate-200" />
								</div>
							</div>
						))}
					</div>
				) : markets.length === 0 ? (
					<p className="py-6 text-center text-sm text-slate-500">
						Market data is unavailable right now.
					</p>
				) : (
					<ul className="divide-y divide-slate-200">
						{markets.map((row) => {
							const up = row.changePercent >= 0;
							return (
								<li
									key={row.ticker}
									className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-slate-700">
											{row.name}
										</p>
										<p className="text-xs text-slate-500">{row.ticker}</p>
									</div>
									<Sparkline points={row.sparkline} positive={up} />
									<div className="shrink-0 text-right">
										<p
											className={cn(
												"text-sm font-semibold tabular-nums",
												up ? "text-green" : "text-red",
											)}
										>
											{formatChange(row.changePercent)}
										</p>
										<p className="text-xs tabular-nums text-slate-500">
											{formatPrice(row.price)}
										</p>
									</div>
								</li>
							);
						})}
					</ul>
				)}

				<div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
					<a
						href={YAHOO_FINANCE_MARKETS_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm font-medium text-[#0f5384] transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					>
						See market
					</a>
				</div>
			</CardContent>
		</Card>
	);
}
