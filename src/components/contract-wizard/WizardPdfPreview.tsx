"use client";

import dynamic from "next/dynamic";
import type { WizardPdfPreviewProps } from "@/components/contract-wizard/WizardPdfPreview.types";

export type { WizardPdfPreviewProps };

const WizardPdfPreviewClient = dynamic(
	() =>
		import("./WizardPdfPreviewClient").then(
			(module) => module.WizardPdfPreviewClient,
		),
	{
		ssr: false,
		loading: () => (
			<div className="flex min-h-[240px] items-center justify-center">
				<span className="text-sm text-slate-600">Loading PDF preview…</span>
			</div>
		),
	},
);

export function WizardPdfPreview(props: WizardPdfPreviewProps) {
	return <WizardPdfPreviewClient {...props} />;
}
