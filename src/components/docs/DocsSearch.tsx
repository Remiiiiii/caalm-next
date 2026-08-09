"use client";

import type { DocsSearchHit } from "@/lib/docs/types";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const SECTION_LABEL: Record<string, string> = {
	learn: "Learn",
	concepts: "Concepts",
	guides: "Guides",
	reference: "Reference",
	admin: "Admin",
	runbooks: "Runbooks",
	troubleshooting: "Troubleshooting",
};

export function DocsSearch() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [hits, setHits] = useState<DocsSearchHit[]>([]);
	const [loading, setLoading] = useState(false);
	const [active, setActive] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listId = useId();

	const close = useCallback(() => {
		setOpen(false);
		setQuery("");
		setHits([]);
		setActive(0);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const isMod = e.metaKey || e.ctrlKey;
			if (isMod && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setOpen(true);
			}
			if (e.key === "Escape") close();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [close]);

	useEffect(() => {
		if (!open) return;
		const t = window.setTimeout(() => inputRef.current?.focus(), 10);
		return () => window.clearTimeout(t);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const q = query.trim();
		if (!q) {
			setHits([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		const controller = new AbortController();
		const timer = window.setTimeout(async () => {
			try {
				const res = await fetch(
					`/api/docs/search?q=${encodeURIComponent(q)}`,
					{ signal: controller.signal },
				);
				const data = (await res.json()) as { hits: DocsSearchHit[] };
				setHits(data.hits || []);
				setActive(0);
			} catch {
				/* aborted or network */
			} finally {
				setLoading(false);
			}
		}, 160);
		return () => {
			controller.abort();
			window.clearTimeout(timer);
		};
	}, [query, open]);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm transition-colors duration-200 hover:border-slate-300 hover:text-slate-700"
			>
				<Search className="h-4 w-4 shrink-0" />
				<span className="flex-1 text-left">Search docs…</span>
				<kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline">
					⌘K
				</kbd>
			</button>

			{open ? (
				<div className="fixed inset-0 z-50">
					<button
						type="button"
						aria-label="Close search"
						className="absolute inset-0 bg-slate-900/40"
						onClick={close}
					/>
					<div className="relative mx-auto mt-[12vh] w-full max-w-xl px-4">
						<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
							<div className="flex items-center gap-2 border-b border-slate-200 px-3">
								<Search className="h-4 w-4 text-slate-400" />
								<input
									ref={inputRef}
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Search CAALM documentation"
									aria-controls={listId}
									aria-autocomplete="list"
									className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
									onKeyDown={(e) => {
										if (e.key === "ArrowDown") {
											e.preventDefault();
											setActive((a) => Math.min(a + 1, hits.length - 1));
										} else if (e.key === "ArrowUp") {
											e.preventDefault();
											setActive((a) => Math.max(a - 1, 0));
										} else if (e.key === "Enter" && hits[active]) {
											e.preventDefault();
											window.location.href = `/docs/${hits[active].slug}`;
										}
									}}
								/>
							</div>
							<div id={listId} className="max-h-[50vh] overflow-y-auto p-2">
								{loading ? (
									<p className="px-3 py-6 text-sm text-slate-500">Searching…</p>
								) : null}
								{!loading && query && hits.length === 0 ? (
									<p className="px-3 py-6 text-sm text-slate-500">
										No results for “{query}”.
									</p>
								) : null}
								{!query ? (
									<p className="px-3 py-6 text-sm text-slate-500">
										Try “contracts”, “2FA”, “permissions”, or “department
										manager”.
									</p>
								) : null}
								<ul className="space-y-1">
									{hits.map((hit, i) => (
										<li key={hit.slug}>
											<Link
												href={`/docs/${hit.slug}`}
												onClick={close}
												className={cn(
													"block rounded-lg px-3 py-2.5 transition-colors duration-150",
													i === active ? "bg-blue-50" : "hover:bg-slate-50",
												)}
											>
												<div className="flex items-center justify-between gap-3">
													<p className="text-sm font-medium text-slate-900">
														{hit.title}
													</p>
													<span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
														{SECTION_LABEL[hit.section] || hit.section}
													</span>
												</div>
												<p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
													{hit.snippet}
												</p>
											</Link>
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}
