"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/ui/loading";

/**
 * pdf.js touches DOMMatrix at module load — keep it off the SSR path.
 */
export const EsignDocumentPreview = dynamic(
	() =>
		import("./EsignDocumentPreviewInner").then((m) => m.EsignDocumentPreview),
	{
		ssr: false,
		loading: () => (
			<div className="flex h-full min-h-60 items-center justify-center">
				<LoadingSpinner size="md" label="Loading preview..." />
			</div>
		),
	},
);
