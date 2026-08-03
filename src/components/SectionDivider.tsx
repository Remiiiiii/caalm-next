"use client";

export default function SectionDivider() {
	return (
		<div className="w-full z-50">
			<div className="container mx-auto px-4">
				<div className="flex items-center gap-3 sm:gap-6">
					<div
						className="hidden sm:block h-px flex-1 border-t border-dashed border-slate-300/70"
						style={{ borderTopWidth: 1 }}
						aria-hidden
					/>
					<p className="text-slate-700 text-sm md:text-base text-center text-pretty max-w-[20rem] sm:max-w-none mx-auto sm:mx-0">
						Adopted by renowned, trusted, and leading enterprises
					</p>
					<div
						className="hidden sm:block h-px flex-1 border-t border-dashed border-slate-300/70"
						style={{ borderTopWidth: 1 }}
						aria-hidden
					/>
				</div>
			</div>
		</div>
	);
}
