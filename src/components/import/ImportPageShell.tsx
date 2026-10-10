import type { ReactNode } from "react";

export function ImportPageShell({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">{title}</h1>
			</div>
			<p className="text-sm text-slate-600 max-w-4xl mb-6">{description}</p>
			{children}
		</div>
	);
}
