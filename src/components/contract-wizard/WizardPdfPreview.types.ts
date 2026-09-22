export type WizardPdfPreviewProps = {
	sessionId: string;
	fileName: string;
	pdfUrl: string | null;
	/** Letterheaded HTML fallback when PDF bytes are unavailable. */
	htmlContent?: string | null;
	fileId: string | null;
	loading: boolean;
	error: string | null;
	/** Hide the wizard title/copy; used inside negotiation dialog. */
	compact?: boolean;
	/** Mount download/print/assistant into this header element. */
	actionsHost?: HTMLElement | null;
	/** Grow to fill the parent and use one scroll area for the page. */
	fillHeight?: boolean;
};
