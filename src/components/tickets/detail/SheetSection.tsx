/** Labelled block inside the ticket details sheet (same rhythm as the Active Incidents sheet). */
export function SheetSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-3 border-t border-slate-200 px-6 py-4">
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
				{title}
			</p>
			{children}
		</section>
	);
}
