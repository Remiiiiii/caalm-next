"use client";

import { Eye, FileCheck, FileStack, FileText, Pencil } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import "@/lib/templates/docx-preview.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { contractTypeAccent } from "@/lib/templates/contract-type-accent";
import { blueprintAccent } from "@/lib/templates/blueprint-accents";
import type { BlueprintCatalogEntry } from "@/lib/templates/blueprint-catalog";
import { cn } from "@/lib/utils";
import type { ContractTemplate } from "@/types/contract-templates";

const PAGE_SIZE = 10;

export type AgreementMatrixView = "builtin" | "templates";

function useMatrixColumns() {
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

function MatrixRows<T>({
	items,
	columns,
	renderItem,
}: {
	items: T[];
	columns: number;
	renderItem: (item: T) => ReactNode;
}) {
	const rows = useMemo(() => {
		const chunks: T[][] = [];
		for (let i = 0; i < items.length; i += columns) {
			chunks.push(items.slice(i, i + columns));
		}
		return chunks;
	}, [items, columns]);

	return (
		<div>
			{rows.map((row, rowIndex) => (
				<div
					key={`row-${rowIndex}-${row.length}`}
					className={cn(
						"grid grid-cols-3 gap-6 py-6 xl:grid-cols-5",
						rowIndex < rows.length - 1 && "border-b border-slate-200",
					)}
				>
					{row.map((item) => renderItem(item))}
				</div>
			))}
		</div>
	);
}

function DocxPreviewTile({
	previewHref,
	title,
	tagAccent,
	selected,
	onPreview,
	fallbackIcon: FallbackIcon = FileText,
}: {
	previewHref: string;
	title: string;
	tagAccent: ReturnType<typeof blueprintAccent>;
	selected?: boolean;
	onPreview: () => void;
	fallbackIcon?: typeof FileText;
}) {
	const [html, setHtml] = useState("");
	const [loaded, setLoaded] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setLoaded(false);
		setFailed(false);
		void fetch(previewHref)
			.then((r) => r.json())
			.then((body) => {
				if (!cancelled) {
					setHtml(body.html || "");
					setLoaded(true);
				}
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});
		return () => {
			cancelled = true;
		};
	}, [previewHref]);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<span className={cn("h-4 w-1 shrink-0 rounded-full", tagAccent.bar)} />
				<span
					className={cn(
						"inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
						tagAccent.badge,
					)}
				>
					{tagAccent.tag}
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
						<FallbackIcon className="h-8 w-8 text-[#0f5384]" />
						<span className="px-2 text-center text-xs font-medium text-slate-700">
							{title}
						</span>
					</div>
				) : loaded ? (
					<div
						className="docx-preview absolute inset-0 origin-top scale-[0.22] overflow-hidden bg-white p-8 text-left"
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				) : null}
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
				<span className="sr-only">Preview {title}</span>
			</button>
		</div>
	);
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
						"inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
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

function TemplateTile({
	template,
	selected,
	onPreview,
}: {
	template: ContractTemplate;
	selected: boolean;
	onPreview: () => void;
}) {
	const accent = contractTypeAccent(template.contractType);
	const previewHref = template.docxFileId
		? `/api/contract-templates/${template.$id}/file?kind=html`
		: "";

	return (
		<div className="flex flex-col gap-2">
			{previewHref ? (
				<>
					<DocxPreviewTile
						previewHref={previewHref}
						title={template.name}
						tagAccent={accent}
						selected={selected}
						onPreview={onPreview}
						fallbackIcon={FileStack}
					/>
					<div>
						<p className="text-sm font-medium sidebar-gradient-text">
							{template.name}
						</p>
						<p className="mt-1 text-xs text-slate-600">
							{template.description || "No description"}
						</p>
					</div>
				</>
			) : (
				<>
					<div className="flex items-center gap-2">
						<span
							className={cn("h-4 w-1 shrink-0 rounded-full", accent.bar)}
						/>
						<span
							className={cn(
								"inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
								accent.badge,
							)}
						>
							{accent.tag}
						</span>
					</div>
					<button
						type="button"
						className="flex aspect-[8.5/11] w-full cursor-pointer flex-col items-center justify-center gap-2 bg-slate-100"
						onClick={onPreview}
					>
						<FileStack className="h-8 w-8 text-[#0f5384]" />
						<span className="px-2 text-center text-xs text-slate-600">
							Preview unavailable
						</span>
					</button>
					<div>
						<p className="text-sm font-medium sidebar-gradient-text">
							{template.name}
						</p>
						<p className="mt-1 text-xs text-slate-600">
							{template.description || "No description"}
						</p>
					</div>
				</>
			)}
		</div>
	);
}

function BlueprintPreviewDialog({
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

function TemplatePreviewDialog({
	template,
	onClose,
	onUse,
	useLabel = "Use this template",
	manageTemplates,
	onEditTemplate,
}: {
	template: ContractTemplate | null;
	onClose: () => void;
	onUse: (template: ContractTemplate) => void;
	useLabel?: string;
	manageTemplates?: boolean;
	onEditTemplate?: (template: ContractTemplate) => void;
}) {
	const [html, setHtml] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!template?.docxFileId) {
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
					`/api/contract-templates/${template.$id}/file?kind=html`,
				);
				const body = await response.json().catch(() => ({}));
				if (!response.ok) {
					throw new Error(body.error || "Could not load the template");
				}
				if (!cancelled) setHtml(body.html || "");
			} catch (loadError) {
				if (!cancelled) {
					setError(
						loadError instanceof Error
							? loadError.message
							: "Could not load the template",
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [template]);

	if (!template) return null;

	return (
		<Dialog open={Boolean(template)} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="mt-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<FileStack className="h-5 w-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							{template.name}
						</DialogTitle>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						{template.description || "Organization agreement template"}
					</p>
				</div>
				<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
					<div className="mx-auto max-w-[640px] rounded-md border border-slate-200 bg-white p-8">
						{loading && (
							<div className="space-y-3">
								<Skeleton className="h-6 w-1/2 bg-slate-200" />
								<Skeleton className="h-4 w-full bg-slate-200" />
							</div>
						)}
						{error && <p className="text-sm text-red">{error}</p>}
						{!loading && !error && html && (
							<div
								className="docx-preview"
								dangerouslySetInnerHTML={{ __html: html }}
							/>
						)}
					</div>
				</div>
				<div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
					{manageTemplates && onEditTemplate ? (
						<Button
							type="button"
							variant="outline"
							className="primary-btn cursor-pointer px-3 sm:px-4"
							onClick={() => {
								onEditTemplate(template);
								onClose();
							}}
						>
							<Pencil className="h-4 w-4" />
							Edit details
						</Button>
					) : null}
					{template.status === "published" ? (
						<Button
							type="button"
							className="primary-btn cursor-pointer px-3 sm:px-4"
							onClick={() => onUse(template)}
						>
							<FileCheck className="h-4 w-4" />
							{useLabel}
						</Button>
					) : (
						<p className="text-sm text-slate-600">Publish this template to use it.</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

export type ContractAgreementMatrixProps = {
	view: AgreementMatrixView;
	onViewChange?: (view: AgreementMatrixView) => void;
	showViewToggle?: boolean;
	blueprints: BlueprintCatalogEntry[];
	templates: ContractTemplate[];
	selectedBlueprintId?: string | null;
	selectedTemplateId?: string | null;
	onSelectBlueprint: (blueprint: BlueprintCatalogEntry) => void;
	onSelectTemplate: (template: ContractTemplate) => void;
	query: string;
	onQueryChange: (value: string) => void;
	searchPlaceholder?: string;
	emptyLabel?: string;
	itemLabel?: string;
	manageTemplates?: boolean;
	onEditTemplate?: (template: ContractTemplate) => void;
	templateUseLabel?: string;
};

export function ContractAgreementMatrix({
	view,
	onViewChange,
	showViewToggle = false,
	blueprints,
	templates,
	selectedBlueprintId,
	selectedTemplateId,
	onSelectBlueprint,
	onSelectTemplate,
	query,
	onQueryChange,
	searchPlaceholder,
	emptyLabel,
	itemLabel,
	manageTemplates,
	onEditTemplate,
	templateUseLabel,
}: ContractAgreementMatrixProps) {
	const [page, setPage] = useState(1);
	const [previewBlueprint, setPreviewBlueprint] =
		useState<BlueprintCatalogEntry | null>(null);
	const [previewTemplate, setPreviewTemplate] =
		useState<ContractTemplate | null>(null);
	const columns = useMatrixColumns();

	const visibleBlueprints = useMemo(() => {
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

	const visibleTemplates = useMemo(() => {
		const q = query.trim().toLowerCase();
		const base = templates.filter((t) => t.status !== "archived");
		if (!q) return base;
		return base.filter((row) => {
			const accent = contractTypeAccent(row.contractType);
			return (
				row.name.toLowerCase().includes(q) ||
				row.description.toLowerCase().includes(q) ||
				accent.tag.toLowerCase().includes(q) ||
				row.contractType.toLowerCase().includes(q)
			);
		});
	}, [templates, query]);

	const activeList =
		view === "templates" ? visibleTemplates : visibleBlueprints;
	const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
	const paged = useMemo(() => {
		const start = (page - 1) * PAGE_SIZE;
		return activeList.slice(start, start + PAGE_SIZE);
	}, [activeList, page]);

	useEffect(() => {
		setPage(1);
	}, [query, view]);

	useEffect(() => {
		if (page > totalPages) setPage(totalPages);
	}, [page, totalPages]);

	return (
		<div className="space-y-4">
			{showViewToggle && onViewChange ? (
				<div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(12rem,20rem)]">
					<div className="min-w-0">
						<h2 className="text-xl font-semibold sidebar-gradient-text">
							Choose the agreement
						</h2>
						<p className="mt-1 max-w-4xl text-sm text-slate-600">
							{view === "builtin"
								? "Choose an agreement below. Scan the category tag, then preview the first page if you want a closer look."
								: "Choose an agreement below from templates your organization saved on Contract Templates."}
						</p>
					</div>
					<div className="flex justify-start lg:justify-center">
						{view === "builtin" ? (
							<Button
								type="button"
								variant="outline"
								className="primary-btn cursor-pointer px-3 sm:px-4"
								onClick={() => onViewChange("templates")}
							>
								<FileStack className="h-4 w-4" />
								Choose an agreement from templates
							</Button>
						) : (
							<Button
								type="button"
								variant="outline"
								className="primary-btn cursor-pointer px-3 sm:px-4"
								onClick={() => onViewChange("builtin")}
							>
								<FileText className="h-4 w-4" />
								Built-in agreements
							</Button>
						)}
					</div>
					<div className="w-full min-w-0 lg:max-w-md lg:justify-self-end">
						<SearchField
							value={query}
							onChange={(event) => onQueryChange(event.target.value)}
							placeholder={
								searchPlaceholder ||
								(view === "templates"
									? "Search templates..."
									: "Search agreements...")
							}
							containerClassName="w-full"
						/>
					</div>
				</div>
			) : null}

			{showViewToggle ? <div className="border-t border-slate-200" /> : null}

			{view === "builtin" ? (
				<MatrixRows
					items={paged as BlueprintCatalogEntry[]}
					columns={columns}
					renderItem={(blueprint) => (
						<BlueprintTile
							key={blueprint.id}
							blueprint={blueprint}
							selected={selectedBlueprintId === blueprint.id}
							onPreview={() => setPreviewBlueprint(blueprint)}
						/>
					)}
				/>
			) : (
				<MatrixRows
					items={paged as ContractTemplate[]}
					columns={columns}
					renderItem={(template) => (
						<TemplateTile
							key={template.$id}
							template={template}
							selected={selectedTemplateId === template.$id}
							onPreview={() => setPreviewTemplate(template)}
						/>
					)}
				/>
			)}

			{activeList.length === 0 && (
				<p className="text-sm text-slate-600">
					{emptyLabel ||
						(view === "templates"
							? "No templates match that search."
							: "No agreements match that search.")}
				</p>
			)}

			{activeList.length > 0 && (
				<PageIndex
					page={page}
					totalItems={activeList.length}
					pageSize={PAGE_SIZE}
					onPageChange={setPage}
					showRange
					itemLabel={
						itemLabel || (view === "templates" ? "templates" : "agreements")
					}
				/>
			)}

			<BlueprintPreviewDialog
				blueprint={previewBlueprint}
				onClose={() => setPreviewBlueprint(null)}
				onUse={(row) => {
					setPreviewBlueprint(null);
					onSelectBlueprint(row);
				}}
			/>

			<TemplatePreviewDialog
				template={previewTemplate}
				onClose={() => setPreviewTemplate(null)}
				onUse={(row) => {
					setPreviewTemplate(null);
					onSelectTemplate(row);
				}}
				useLabel={templateUseLabel}
				manageTemplates={manageTemplates}
				onEditTemplate={onEditTemplate}
			/>
		</div>
	);
}
