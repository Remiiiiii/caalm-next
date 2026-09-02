"use client";

import { Eye, FileCheck, FileText } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import "@/lib/templates/docx-preview.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { blueprintAccent } from "@/lib/templates/blueprint-accents";
import type { BlueprintCatalogEntry } from "@/lib/templates/blueprint-catalog";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type BlueprintPickerGridProps = {
	blueprints: BlueprintCatalogEntry[];
	selectedId: string | null;
	onSelect: (blueprint: BlueprintCatalogEntry) => void;
};

export function BlueprintPickerGrid({
	blueprints,
	selectedId,
	onSelect,
}: BlueprintPickerGridProps) {
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [preview, setPreview] = useState<BlueprintCatalogEntry | null>(null);

	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return blueprints;
		return blueprints.filter((row) => {
			const accent = blueprintAccent(row.id);
			return (
				row.label.toLowerCase().includes(q) ||
				row.description.toLowerCase().includes(q) ||
				accent.tag.toLowerCase().includes(q)
			);
		});
	}, [blueprints, query]);

	const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
	const paged = useMemo(() => {
		const start = (page - 1) * PAGE_SIZE;
		return visible.slice(start, start + PAGE_SIZE);
	}, [visible, page]);
	const columns = useBlueprintColumns();
	const rows = useMemo(() => {
		const chunks: BlueprintCatalogEntry[][] = [];
		for (let i = 0; i < paged.length; i += columns) {
			chunks.push(paged.slice(i, i + columns));
		}
		return chunks;
	}, [paged, columns]);

	useEffect(() => {
		setPage(1);
	}, [query]);

	useEffect(() => {
		if (page > totalPages) setPage(totalPages);
	}, [page, totalPages]);

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
				<div className="min-w-0 flex-1">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Choose the agreement
					</h2>
					<p className="mt-1 max-w-4xl text-sm text-slate-600">
						Scan the category tag, then preview the first page if you want a
						closer look. Using one starts a new draft; it does not change an
						existing contract.
					</p>
				</div>
				<div
					className="hidden w-px shrink-0 self-stretch bg-slate-200 sm:mx-6 sm:block"
					aria-hidden
				/>
				<div className="sm:flex sm:max-w-md sm:shrink-0 sm:items-end sm:w-full">
					<SearchField
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search agreements..."
						containerClassName="w-full"
					/>
				</div>
			</div>

			<div className="border-t border-slate-200" />

			<div>
				{rows.map((row, rowIndex) => (
					<div
						key={row.map((item) => item.id).join("-")}
						className={cn(
							"grid grid-cols-2 gap-6 py-6 md:grid-cols-3 xl:grid-cols-5",
							rowIndex < rows.length - 1 && "border-b border-slate-200",
						)}
					>
						{row.map((blueprint) => (
							<BlueprintTile
								key={blueprint.id}
								blueprint={blueprint}
								selected={selectedId === blueprint.id}
								onPreview={() => setPreview(blueprint)}
							/>
						))}
					</div>
				))}
			</div>

			{visible.length === 0 && (
				<p className="text-sm text-slate-600">No agreements match that search.</p>
			)}

			{visible.length > 0 && (
				<PageIndex
					page={page}
					totalItems={visible.length}
					pageSize={PAGE_SIZE}
					onPageChange={setPage}
					showRange
					itemLabel="agreements"
				/>
			)}

			<PreviewDialog
				blueprint={preview}
				onClose={() => setPreview(null)}
				onUse={(row) => {
					setPreview(null);
					onSelect(row);
				}}
			/>
		</div>
	);
}

function useBlueprintColumns() {
	const [columns, setColumns] = useState(2);

	useEffect(() => {
		const update = () => {
			const width = window.innerWidth;
			if (width >= 1280) setColumns(5);
			else if (width >= 768) setColumns(3);
			else setColumns(2);
		};
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	return columns;
}

function BlueprintTile({
	blueprint,
	selected,
	onPreview,
}: {
	blueprint: BlueprintCatalogEntry;
	selected: boolean;
	onPreview: () => void;
}) {
	const accent = blueprintAccent(blueprint.id);
	const src =
		blueprint.thumbnailUrl || `/assets/contract-blueprints/${blueprint.id}.png`;
	const [loaded, setLoaded] = useState(false);
	const [failed, setFailed] = useState(false);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<span className={cn("h-4 w-1 shrink-0 rounded-full", accent.bar)} />
				<span
					className={cn(
						"inline-block px-2 py-0.5 text-xs font-medium rounded-full border",
						accent.badge,
					)}
				>
					{accent.tag}
				</span>
			</div>

			<button
				type="button"
				className={cn(
					"group relative w-full cursor-pointer overflow-hidden bg-slate-100 transition-all duration-200",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
					selected && "ring-2 ring-[#0f5384]/40",
				)}
				style={{ aspectRatio: "8.5 / 11" }}
				onClick={onPreview}
			>
				{!loaded && !failed && (
					<Skeleton className="absolute inset-0 rounded-none bg-slate-200" />
				)}
				{failed ? (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50">
						<FileText className="h-8 w-8 text-[#0f5384]" />
						<span className="px-2 text-center text-xs font-medium text-slate-700">
							{blueprint.label}
						</span>
					</div>
				) : (
					<Image
						src={src}
						alt=""
						fill
						sizes="(min-width: 1280px) 18vw, (min-width: 768px) 30vw, 45vw"
						className={cn(
							"object-contain object-top transition-opacity duration-200",
							loaded ? "opacity-100" : "opacity-0",
						)}
						onLoad={() => setLoaded(true)}
						onError={() => setFailed(true)}
					/>
				)}
				<span
					aria-hidden
					className={cn(
						"pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1",
						"bg-slate-900/45 text-white opacity-0 transition-opacity duration-200",
						"group-hover:opacity-100 group-focus-visible:opacity-100",
					)}
				>
					<Eye className="h-5 w-5" />
					<span className="text-sm font-medium">Preview</span>
				</span>
				<span className="sr-only">Preview {blueprint.label}</span>
			</button>

			<div>
				<p className="text-sm font-medium sidebar-gradient-text">
					{blueprint.label}
				</p>
				<p className="mt-1 text-xs text-slate-600">{blueprint.description}</p>
			</div>
		</div>
	);
}

function PreviewDialog({
	blueprint,
	onClose,
	onUse,
}: {
	blueprint: BlueprintCatalogEntry | null;
	onClose: () => void;
	onUse: (blueprint: BlueprintCatalogEntry) => void;
}) {
	const [html, setHtml] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!blueprint) {
			setHtml("");
			setError(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setError(null);
		void (async () => {
			try {
				const response = await fetch(
					`/api/contracts/wizard/blueprints/${blueprint.id}/file?kind=html`,
				);
				const body = await response.json().catch(() => ({}));
				if (!response.ok) {
					throw new Error(body.error || "Could not load the agreement");
				}
				if (!cancelled) setHtml(body.html || "");
			} catch (loadError) {
				if (!cancelled) {
					setError(
						loadError instanceof Error
							? loadError.message
							: "Could not load the agreement",
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [blueprint]);

	if (!blueprint) return null;

	return (
		<Dialog open={Boolean(blueprint)} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="mt-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<FileText className="h-5 w-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							{blueprint.label}
						</DialogTitle>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						Full blueprint from the source file. Placeholders stay empty until
						you fill them on the next step.
					</p>
				</div>
				<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
					<div className="mx-auto max-w-[640px] rounded-md border border-slate-200 bg-white p-8">
						{loading && (
							<div className="space-y-3">
								<Skeleton className="h-6 w-1/2 bg-slate-200" />
								<Skeleton className="h-4 w-full bg-slate-200" />
								<Skeleton className="h-4 w-5/6 bg-slate-200" />
								<Skeleton className="h-4 w-full bg-slate-200" />
							</div>
						)}
						{error && <p className="text-sm text-red">{error}</p>}
						{!loading && !error && (
							<div
								className="docx-preview"
								dangerouslySetInnerHTML={{ __html: html }}
							/>
						)}
					</div>
				</div>
				<div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
					<Button
						type="button"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						onClick={() => onUse(blueprint)}
					>
						<FileCheck className="h-4 w-4" />
						Use this agreement
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
