"use client";

import dynamic from "next/dynamic";

/**
 * pdf.js touches DOMMatrix at module load — keep it off the SSR path
 * (same pattern as DocumentViewer.tsx).
 */
const ExpiryFilePdfViewer = dynamic(
	() => import("./ExpiryFilePdfViewerInner"),
	{
		ssr: false,
		loading: () => (
			<div className="flex h-64 items-center justify-center text-sm text-slate-500">
				Loading document…
			</div>
		),
	},
);

export default ExpiryFilePdfViewer;
