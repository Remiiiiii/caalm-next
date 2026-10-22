"use client";

import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useState,
} from "react";
import { PILL, RAG_PILL } from "@/components/audits/readiness/readiness-ui";
import { Button } from "@/components/ui/button";
import { catalogForRecordKind } from "@/lib/audits/readiness/evidence-map.seed";
import { cn } from "@/lib/utils";

type CatalogRow = {
	requirementId: string;
	label: string;
	auditType: string;
};

function catalogRows(kind: "contract" | "license"): CatalogRow[] {
	return catalogForRecordKind(kind).map((row) => ({
		requirementId: row.requirementId,
		label: row.label,
		auditType: row.auditType,
	}));
}

const lastSelectionByRecord = new Map<string, string[]>();
const STORAGE_PREFIX = "caalm.evidence-tags.";

function selectionKey(kind: "contract" | "license", recordId: string) {
	return `${kind}:${recordId}`;
}

function readCachedIds(
	kind: "contract" | "license",
	recordId: string,
): string[] | null {
	const mem = lastSelectionByRecord.get(selectionKey(kind, recordId));
	if (mem) return mem;
	if (typeof window === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(
			STORAGE_PREFIX + selectionKey(kind, recordId),
		);
		if (raw == null) return null;
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return null;
		const ids = parsed.filter((item): item is string => typeof item === "string");
		lastSelectionByRecord.set(selectionKey(kind, recordId), ids);
		return ids;
	} catch {
		return null;
	}
}

function writeCachedIds(
	kind: "contract" | "license",
	recordId: string,
	ids: string[],
) {
	lastSelectionByRecord.set(selectionKey(kind, recordId), ids);
	if (typeof window === "undefined") return;
	try {
		sessionStorage.setItem(
			STORAGE_PREFIX + selectionKey(kind, recordId),
			JSON.stringify(ids),
		);
	} catch {
		/* private mode / quota */
	}
}

export type EvidenceTaggerHandle = {
	save: () => Promise<void>;
	isDirty: boolean;
};

type Suggestion = {
	requirementId: string;
	label: string;
	confidence: number;
	rationale: string;
	source: "ai" | "fallback";
};

interface EvidenceRequirementTaggerProps {
	kind: "contract" | "license";
	recordId: string;
	enabled: boolean;
	onDirtyChange?: (dirty: boolean) => void;
}

export const EvidenceRequirementTagger = forwardRef<
	EvidenceTaggerHandle,
	EvidenceRequirementTaggerProps
>(function EvidenceRequirementTagger(
	{ kind, recordId, enabled, onDirtyChange },
	ref,
) {
	const [catalog, setCatalog] = useState<CatalogRow[]>(() => catalogRows(kind));
	const [savedIds, setSavedIds] = useState<string[]>(
		() => readCachedIds(kind, recordId) ?? [],
	);
	const [selectedIds, setSelectedIds] = useState<string[]>(
		() => readCachedIds(kind, recordId) ?? [],
	);
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [dismissed, setDismissed] = useState<string[]>([]);
	const [suggesting, setSuggesting] = useState(() => {
		const cached = readCachedIds(kind, recordId);
		return cached !== null && cached.length === 0;
	});

	const dirty =
		[...selectedIds].sort().join("|") !== [...savedIds].sort().join("|");

	useEffect(() => {
		onDirtyChange?.(dirty);
	}, [dirty, onDirtyChange]);

	const load = useCallback(async () => {
		if (!enabled || !recordId) return;
		const cached = readCachedIds(kind, recordId);
		if (cached && cached.length > 0) setSuggesting(false);

		const base = `/api/${kind === "license" ? "licenses" : "contracts"}/${recordId}/evidence-tags`;
		const tagsRes = await fetch(base);
		let ids = cached ?? [];
		if (tagsRes.ok) {
			const json = await tagsRes.json();
			ids = (json.data?.requirementIds ?? []) as string[];
			writeCachedIds(kind, recordId, ids);
			setSavedIds(ids);
			setSelectedIds(ids);
			const nextCatalog = (json.data?.catalog ?? []) as CatalogRow[];
			if (nextCatalog.length > 0) setCatalog(nextCatalog);
		}
		if (ids.length > 0) {
			setSuggesting(false);
			return;
		}

		setSuggesting(true);
		const recRes = await fetch(`${base}/recommend`, { method: "POST" });
		if (recRes.ok) {
			const json = await recRes.json();
			setSuggestions((json.data?.suggestions ?? []) as Suggestion[]);
		}
		setDismissed([]);
		setSuggesting(false);
	}, [enabled, kind, recordId]);

	useEffect(() => {
		const cached = readCachedIds(kind, recordId);
		setCatalog(catalogRows(kind));
		setSavedIds(cached ?? []);
		setSelectedIds(cached ?? []);
		setSuggestions([]);
		setDismissed([]);
		setSuggesting(cached !== null && cached.length === 0);
	}, [kind, recordId]);

	useEffect(() => {
		void load();
	}, [load]);

	const save = useCallback(async () => {
		const response = await fetch(
			`/api/${kind === "license" ? "licenses" : "contracts"}/${recordId}/evidence-tags`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ requirementIds: selectedIds }),
			},
		);
		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(error.error || "Failed to save evidence tags");
		}
		writeCachedIds(kind, recordId, selectedIds);
		setSavedIds(selectedIds);
	}, [kind, recordId, selectedIds]);

	useImperativeHandle(ref, () => ({ save, isDirty: dirty }), [save, dirty]);

	const toggle = (id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
		);
	};

	const pendingSuggestions = suggestions.filter(
		(item) =>
			!selectedIds.includes(item.requirementId) &&
			!dismissed.includes(item.requirementId),
	);

	return (
		<section className="space-y-3">
			<div>
				<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
					Audit evidence
				</p>
				<p className="mt-0.5 text-xs text-slate-500">
					Mark which requirements this {kind} satisfies. Suggestions appear
					first — confirm before Save.
				</p>
			</div>

			{suggesting && savedIds.length === 0 && selectedIds.length === 0 ? (
				<p className="text-xs text-slate-500">Loading suggestions…</p>
			) : null}

			{pendingSuggestions.length > 0 ? (
				<div className="space-y-2">
					<p className="text-xs font-semibold text-slate-600">
						Suggested first
					</p>
					{pendingSuggestions.map((item) => (
						<div
							key={item.requirementId}
							className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2"
						>
							<div className="min-w-0">
								<p className="text-sm font-medium text-slate-700">
									{item.requirementId}
								</p>
								<p className="text-xs text-slate-500">{item.label}</p>
							</div>
							<div className="flex gap-2">
								<Button
									type="button"
									size="sm"
									className="btn-primary h-7 px-2 text-xs"
									onClick={() => toggle(item.requirementId)}
								>
									Accept
								</Button>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									className="h-7 px-2 text-xs"
									onClick={() =>
										setDismissed((prev) => [...prev, item.requirementId])
									}
								>
									Dismiss
								</Button>
							</div>
						</div>
					))}
				</div>
			) : null}

			<div className="flex flex-wrap gap-2">
				{catalog.map((row) => {
					const selected = selectedIds.includes(row.requirementId);
					return (
						<button
							key={row.requirementId}
							type="button"
							onClick={() => toggle(row.requirementId)}
							className={cn(
								PILL,
								"cursor-pointer",
								selected ? RAG_PILL.green : "bg-slate-100 text-slate-600 border-slate-200",
							)}
						>
							{row.requirementId}
						</button>
					);
				})}
			</div>
		</section>
	);
});
