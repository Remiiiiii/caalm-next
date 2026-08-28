"use client";

import { useState } from "react";
import { Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
	BBC_NEWS_URL,
	MSN_NEWS_URL,
	type BriefingNewsItem,
} from "@/types/briefing";

type MsnNewsCardsProps = {
	news: BriefingNewsItem[];
	loading?: boolean;
};

function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return "";
	const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h`;
	return `${Math.round(hours / 24)}d`;
}

function seeNewsUrl(news: BriefingNewsItem[]): string {
	const source = news[0]?.source ?? "";
	if (/bbc/i.test(source)) return BBC_NEWS_URL;
	return MSN_NEWS_URL;
}

const newsCardClass =
	"overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md";

export function MsnNewsCards({ news, loading = false }: MsnNewsCardsProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between px-1">
				<h3 className="text-sm font-semibold text-slate-700">News</h3>
				<a
					href={seeNewsUrl(news)}
					target="_blank"
					rel="noopener noreferrer"
					className="text-sm font-medium text-[#0f5384] transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				>
					See news
				</a>
			</div>

			{loading ? (
				<>
					<NewsCardSkeleton />
					<NewsCardSkeleton />
				</>
			) : news.length === 0 ? (
				<p className="py-6 text-center text-sm text-slate-500">
					Headlines are unavailable right now.
				</p>
			) : (
				news.slice(0, 2).map((item) => {
					const href = item.articleUrl;
					if (!href) {
						return (
							<Card key={item.id} className={newsCardClass}>
								<NewsCardBody item={item} />
							</Card>
						);
					}

					return (
						<a
							key={item.id}
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="block cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
							onPointerDown={(event) => event.stopPropagation()}
							onClick={(event) => event.stopPropagation()}
						>
							<Card className={newsCardClass}>
								<NewsCardBody item={item} />
							</Card>
						</a>
					);
				})
			)}
		</div>
	);
}

function NewsCardBody({ item }: { item: BriefingNewsItem }) {
	const [imageFailed, setImageFailed] = useState(false);
	const showImage = Boolean(item.imageUrl) && !imageFailed;

	return (
		<>
			{showImage ? (
				<img
					src={item.imageUrl ?? ""}
					alt=""
					referrerPolicy="no-referrer"
					onError={() => setImageFailed(true)}
					className="aspect-video h-auto w-full bg-slate-100 object-cover"
				/>
			) : (
				<div className="flex aspect-video w-full items-center justify-center bg-slate-100">
					<Newspaper className="h-8 w-8 text-slate-400" />
				</div>
			)}
			<CardContent className="bg-white p-4">
				<p className="mb-2 text-xs text-slate-500">
					<span className="font-medium text-slate-700">{item.source}</span>
					{item.publishedAt ? (
						<>
							{" · "}
							{relativeTime(item.publishedAt)}
						</>
					) : null}
				</p>
				<h4 className="text-base font-semibold leading-snug text-slate-700">
					{item.title}
				</h4>
			</CardContent>
		</>
	);
}

function NewsCardSkeleton() {
	return (
		<Card className={newsCardClass}>
			<div className="aspect-video w-full animate-pulse bg-slate-200" />
			<CardContent className="space-y-2 bg-white p-4">
				<div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
				<div className="h-4 w-full animate-pulse rounded bg-slate-200" />
				<div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
			</CardContent>
		</Card>
	);
}
