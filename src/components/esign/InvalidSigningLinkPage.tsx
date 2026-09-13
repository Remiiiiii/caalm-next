"use client";

import Image from "next/image";
import {
	explanationForEsignCode,
	isEsignErrorCode,
	type EsignErrorCode,
} from "@/lib/esign/errors";

export function InvalidSigningLinkPage({
	code,
	message,
}: {
	code?: string | null;
	message?: string | null;
}) {
	const resolved: EsignErrorCode | null = isEsignErrorCode(code) ? code : null;
	const explanation = explanationForEsignCode(resolved);

	return (
		<div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
			<Image
				src="/assets/icons/no-data.svg"
				alt=""
				width={160}
				height={160}
				priority
			/>
			<h1 className="mt-6 text-xl font-semibold sidebar-gradient-text">
				Signing link unavailable
			</h1>
			<p className="mt-2 max-w-md text-sm text-slate-600">{explanation}</p>
			{message && message !== explanation ? (
				<p className="mt-2 max-w-md text-xs text-slate-500">{message}</p>
			) : null}
			{resolved ? (
				<p className="mt-6 text-2xl font-bold tabular-nums text-slate-700">
					{resolved}
				</p>
			) : null}
		</div>
	);
}
