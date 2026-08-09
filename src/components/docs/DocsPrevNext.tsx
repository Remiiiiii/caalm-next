import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function DocsPrevNext({
	prev,
	next,
}: {
	prev: { title: string; slug: string } | null;
	next: { title: string; slug: string } | null;
}) {
	if (!prev && !next) return null;

	return (
		<div className="mt-14 grid gap-3 border-t border-slate-200 pt-8 sm:grid-cols-2">
			{prev ? (
				<Link
					href={`/docs/${prev.slug}`}
					className="group rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/40"
				>
					<p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
						<ArrowLeft className="h-3.5 w-3.5" />
						Previous
					</p>
					<p className="text-sm font-semibold text-slate-900 group-hover:text-[#0f5384]">
						{prev.title}
					</p>
				</Link>
			) : (
				<div />
			)}
			{next ? (
				<Link
					href={`/docs/${next.slug}`}
					className="group rounded-xl border border-slate-200 bg-white p-4 text-right transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/40 sm:justify-self-end sm:text-right"
				>
					<p className="mb-1 flex items-center justify-end gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
						Next
						<ArrowRight className="h-3.5 w-3.5" />
					</p>
					<p className="text-sm font-semibold text-slate-900 group-hover:text-[#0f5384]">
						{next.title}
					</p>
				</Link>
			) : null}
		</div>
	);
}
