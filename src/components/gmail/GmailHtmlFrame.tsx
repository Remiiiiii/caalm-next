"use client";

import { useCallback, useEffect, useRef } from "react";
import { wrapEmailHtmlDocument } from "@/lib/gmail/render-html";

type GmailHtmlFrameProps = {
	html: string;
};

/** Sandboxed HTML email body — scripts off; popups allowed so links can open. */
export default function GmailHtmlFrame({ html }: GmailHtmlFrameProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const srcDoc = wrapEmailHtmlDocument(html);

	const resize = useCallback(() => {
		const iframe = iframeRef.current;
		const doc = iframe?.contentDocument;
		if (!iframe || !doc?.documentElement) return;
		const height = Math.max(
			doc.documentElement.scrollHeight,
			doc.body?.scrollHeight ?? 0,
			120,
		);
		iframe.style.height = `${height}px`;
	}, []);

	const onLoad = useCallback(() => {
		resize();
		const doc = iframeRef.current?.contentDocument;
		if (!doc) return;

		// Late-loading images change height after first paint
		const imgs = Array.from(doc.images || []);
		for (const img of imgs) {
			if (!img.complete) {
				img.addEventListener("load", resize, { once: true });
				img.addEventListener("error", resize, { once: true });
			}
		}
	}, [resize]);

	useEffect(() => {
		resize();
	}, [srcDoc, resize]);

	return (
		<iframe
			ref={iframeRef}
			title="Email message"
			srcDoc={srcDoc}
			onLoad={onLoad}
			sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
			referrerPolicy="no-referrer"
			className="block w-full min-h-[120px] border-0 bg-white"
		/>
	);
}
