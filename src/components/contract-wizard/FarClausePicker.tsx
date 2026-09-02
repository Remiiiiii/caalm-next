"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
import {
	filterFarClauses,
	parseFarClauseNumbers,
	serializeFarClauseSelection,
	type FarClause,
} from "@/lib/templates/far-clauses";
import { cn } from "@/lib/utils";

type FarClausePickerProps = {
	value: string;
	onChange: (next: string) => void;
	onFocus?: () => void;
	label: string;
	labelClassName?: string;
	className?: string;
};

export function FarClausePicker({
	value,
	onChange,
	onFocus,
	label,
	labelClassName,
	className,
}: FarClausePickerProps) {
	const [clauses, setClauses] = useState<FarClause[]>([]);
	const [asOf, setAsOf] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const response = await fetch("/api/contracts/wizard/far-clauses");
				const body = await response.json().catch(() => ({}));
				if (!response.ok) {
					throw new Error(body.error || "Could not load FAR clauses");
				}
				if (cancelled) return;
				setClauses(Array.isArray(body.clauses) ? body.clauses : []);
				setAsOf(typeof body.asOf === "string" ? body.asOf : null);
				setError(null);
			} catch (err) {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : "Could not load FAR clauses");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const selected = useMemo(() => parseFarClauseNumbers(value), [value]);
	const selectedSet = useMemo(() => new Set(selected), [selected]);
	const visible = useMemo(
		() => filterFarClauses(clauses, query).slice(0, 200),
		[clauses, query],
	);
	const selectedClauses = useMemo(
		() =>
			selected
				.map((number) => clauses.find((clause) => clause.number === number))
				.filter((clause): clause is FarClause => Boolean(clause)),
		[selected, clauses],
	);

	// Rewrite older selections that omitted the "FAR" prefix so the live doc matches.
	useEffect(() => {
		if (clauses.length === 0 || selected.length === 0) return;
		const normalized = serializeFarClauseSelection(selected, clauses);
		if (normalized !== value) onChange(normalized);
	}, [clauses, selected, value, onChange]);

	const toggle = (number: string, checked: boolean) => {
		const next = new Set(selected);
		if (checked) next.add(number);
		else next.delete(number);
		onChange(serializeFarClauseSelection([...next], clauses));
	};

	return (
		<div className={cn("md:col-span-2", className)}>
			<div className="flex items-start justify-between gap-3">
				<div>
					<Label className={labelClassName}>{label}</Label>
					<p className="mt-1 text-xs text-slate-500">
						Pick FAR Part 52 clauses from eCFR
						{asOf ? ` (current as of ${asOf})` : ""}.
					</p>
				</div>
				{selected.length > 0 && (
					<p className="shrink-0 text-xs text-slate-500">
						{selected.length} selected
					</p>
				)}
			</div>

			{selectedClauses.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-2">
					{selectedClauses.map((clause) => (
						<button
							key={clause.number}
							type="button"
							className="inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-left text-xs font-medium text-blue transition-colors duration-200 hover:border-blue/40"
							onClick={() => {
								onFocus?.();
								toggle(clause.number, false);
							}}
							aria-label={`Remove ${clause.number}`}
						>
							<span className="truncate">
								{clause.number} — {clause.title}
							</span>
							<X className="h-3 w-3 shrink-0" aria-hidden />
						</button>
					))}
				</div>
			)}

			<div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
				<SearchField
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					onFocus={onFocus}
					placeholder="Search by number or title (e.g. 52.212-4)"
					aria-label="Search FAR clauses"
				/>

				{loading && (
					<p className="flex items-center gap-2 py-6 text-sm text-slate-600">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading FAR clauses…
					</p>
				)}

				{!loading && error && (
					<p className="py-4 text-sm text-red">{error}</p>
				)}

				{!loading && !error && (
					<div
						className="max-h-64 space-y-1 overflow-y-auto pr-1"
						role="listbox"
						aria-multiselectable="true"
						aria-label="FAR Part 52 clauses"
					>
						{visible.length === 0 ? (
							<p className="py-4 text-sm text-slate-600">
								No clauses match that search.
							</p>
						) : (
							visible.map((clause) => {
								const checked = selectedSet.has(clause.number);
								const id = `far-clause-${clause.number}`;
								return (
									<label
										key={clause.number}
										htmlFor={id}
										className={cn(
											"flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition-colors duration-200 hover:bg-blue-50",
											checked && "bg-blue/10",
										)}
									>
										<Checkbox
											id={id}
											checked={checked}
											className="mt-0.5"
											onCheckedChange={(next) => {
												onFocus?.();
												toggle(clause.number, next === true);
											}}
										/>
										<span className="min-w-0">
											<span className="block text-sm font-medium text-slate-700">
												{clause.number}
											</span>
											<span className="block text-xs text-slate-500">
												{clause.title}
											</span>
										</span>
									</label>
								);
							})
						)}
						{!query.trim() && clauses.length > visible.length && (
							<p className="px-2 py-2 text-xs text-slate-500">
								Showing first {visible.length} of {clauses.length}. Search to
								narrow the list.
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
