"use client";

import dynamic from "next/dynamic";

/**
 * pdf.js touches DOMMatrix at module load — keep it off the SSR path.
 * Call sites keep importing `@/components/DocumentViewer`.
 */
const DocumentViewer = dynamic(() => import("./DocumentViewerInner"), {
	ssr: false,
	loading: () => null,
});

export default DocumentViewer;
