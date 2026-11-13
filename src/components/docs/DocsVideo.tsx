"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import type { DocsVideoSpec } from "@/lib/docs/video";
import { mediaUrl } from "@/lib/media/urls";

/**
 * Click-to-play docs video: shows the poster and a play button, and loads the hosted
 * player only after the reader asks for it (no autoplay, no player cost on page load).
 */
export function DocsVideo({ video }: { video: DocsVideoSpec }) {
	const [playing, setPlaying] = useState(false);
	const label = video.duration
		? `Play video: ${video.title} (${video.duration})`
		: `Play video: ${video.title}`;

	return (
		<figure className="my-6">
			<div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900">
				{playing ? (
					<iframe
						src={video.embed}
						title={video.title}
						className="absolute inset-0 h-full w-full"
						allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
						allowFullScreen
						referrerPolicy="strict-origin-when-cross-origin"
					/>
				) : (
					<button
						type="button"
						onClick={() => setPlaying(true)}
						aria-label={label}
						className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-[#078FAB] focus-visible:outline-none focus-visible:ring-inset"
					>
						{/* Poster is a static docs asset (optionally on NEXT_PUBLIC_MEDIA_BASE_URL); a plain img avoids remotePatterns for a CDN origin. */}
						<img
							src={mediaUrl(video.poster)}
							alt=""
							className="h-full w-full object-cover"
							loading="lazy"
							decoding="async"
						/>
						<span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition-colors group-hover:bg-slate-900/5">
							<span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#0f5384] to-[#078fab] text-white shadow-lg ring-4 ring-white/70 group-hover:scale-105 motion-safe:transition-transform">
								<Play
									className="h-7 w-7 translate-x-0.5"
									fill="currentColor"
									aria-hidden
								/>
							</span>
						</span>
					</button>
				)}
			</div>
			<figcaption className="mt-2 text-sm text-slate-500 dark:text-slate-400">
				{[video.duration, "Captions available in the player"]
					.filter(Boolean)
					.join(" · ")}
			</figcaption>
		</figure>
	);
}
