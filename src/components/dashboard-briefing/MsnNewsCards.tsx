"use client";

import { Newspaper } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { newsHeaderLinks, showGoogleNewsCardLink } from "@/lib/briefing/news-header-links";
import { GOOGLE_NEWS_URL, type BriefingNewsItem } from "@/types/briefing";

type MsnNewsCardsProps = {
	news: BriefingNewsItem[];
	loading?: boolean;
};

const SNIPPET_MS = 5000;

function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return "";
	const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h`;
	return `${Math.round(hours / 24)}d`;
}

const newsLinkClass =
	"text-sm font-medium text-[#0f5384] transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40";

const newsCardClass =
	"overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md";

const mediaClass = "aspect-video h-auto w-full bg-slate-100 object-cover";

export function MsnNewsCards({ news, loading = false }: MsnNewsCardsProps) {
	const headerLinks = newsHeaderLinks(news);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between px-1">
				<h3 className="text-sm font-semibold text-slate-700">News</h3>
				{headerLinks.map((link) => (
					<a
						key={link.label}
						href={link.href}
						target="_blank"
						rel="noopener noreferrer"
						className={newsLinkClass}
					>
						{link.label}
					</a>
				))}
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
					const showGoogleLink = showGoogleNewsCardLink(news, item);
					const card = href ? (
						<a
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
					) : (
						<Card className={newsCardClass}>
							<NewsCardBody item={item} />
						</Card>
					);

					return (
						<div key={item.id} className="space-y-1">
							{showGoogleLink ? (
								<div className="flex justify-end px-1">
									<a
										href={GOOGLE_NEWS_URL}
										target="_blank"
										rel="noopener noreferrer"
										className={newsLinkClass}
										onPointerDown={(event) => event.stopPropagation()}
										onClick={(event) => event.stopPropagation()}
									>
										See news
									</a>
								</div>
							) : null}
							{card}
						</div>
					);
				})
			)}
		</div>
	);
}

function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return true;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function NewsCardBody({ item }: { item: BriefingNewsItem }) {
	const [imageFailed, setImageFailed] = useState(false);
	const [videoFailed, setVideoFailed] = useState(false);
	const showImage = Boolean(item.imageUrl) && !imageFailed;
	const showVideo = !showImage && Boolean(item.videoUrl) && !videoFailed;

	return (
		<>
			{showImage ? (
				<img
					src={item.imageUrl ?? ""}
					alt=""
					referrerPolicy="no-referrer"
					onError={() => setImageFailed(true)}
					className={mediaClass}
				/>
			) : showVideo && item.videoUrl ? (
				<NewsCardVideo
					src={item.videoUrl}
					onFailed={() => setVideoFailed(true)}
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
				<h4 className="text-sm font-semibold leading-snug text-slate-700">
					{item.title}
					{item.excerpt ? (
						<span className="font-normal text-xs text-slate-600">
							{" - "}
							{item.excerpt}
						</span>
					) : null}
				</h4>
			</CardContent>
		</>
	);
}

function NewsCardVideo({
	src,
	onFailed,
}: {
	src: string;
	onFailed: () => void;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const snippetTimer = useRef<number>(0);

	const stopSnippet = () => {
		window.clearTimeout(snippetTimer.current);
		const video = videoRef.current;
		if (!video) return;
		video.pause();
		video.currentTime = 0.1;
	};

	const playSnippet = () => {
		if (prefersReducedMotion()) return;
		const video = videoRef.current;
		if (!video) return;
		window.clearTimeout(snippetTimer.current);
		video.currentTime = 0;
		void video.play().catch(() => onFailed());
		snippetTimer.current = window.setTimeout(stopSnippet, SNIPPET_MS);
	};

	useEffect(() => {
		return () => window.clearTimeout(snippetTimer.current);
	}, []);

	return (
		<video
			ref={videoRef}
			src={src}
			muted
			playsInline
			preload="metadata"
			controls={false}
			tabIndex={-1}
			referrerPolicy="no-referrer"
			onLoadedMetadata={(event) => {
				event.currentTarget.currentTime = 0.1;
			}}
			onError={onFailed}
			onMouseEnter={playSnippet}
			onMouseLeave={stopSnippet}
			className={mediaClass}
			aria-hidden
		/>
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
