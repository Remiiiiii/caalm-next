import Link from "next/link";

export default function DocsNotFound() {
	return (
		<div className="mx-auto max-w-lg py-20 text-center">
			<p className="text-sm font-semibold uppercase tracking-wider text-[#0f5384] dark:text-sky-300">
				404
			</p>
			<h1 className="mt-2 text-3xl font-semibold text-slate-700 dark:text-slate-50">
				Page not found
			</h1>
			<p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
				That docs page does not exist. Head back to the docs home or search
				with ⌘K.
			</p>
			<Link
				href="/docs"
				className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#0f5384] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
			>
				Back to CAALM Docs
			</Link>
		</div>
	);
}
