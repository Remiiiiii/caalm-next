"use client";

import { CheckCircle2, CloudDownload, FileSearch } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ResourceType = "contract" | "license";
type AuthState = "loading" | "caalm" | "guest";

/**
 * Post-sign screen.
 * Enterprise pattern (DocuSign / Acrobat Sign): guests get download + "you're done",
 * not a product-home redirect. In-app users get a path back to signing status.
 */
export function EsignSignedConfirmation({
	title,
	declined,
	resourceType,
	resourceId,
	documentUrl,
}: {
	title: string;
	declined?: boolean;
	resourceType?: ResourceType;
	resourceId?: string;
	/** Token-gated PDF URL for download (same as signing preview). */
	documentUrl?: string;
}) {
	const [authState, setAuthState] = useState<AuthState>("loading");

	useEffect(() => {
		let cancelled = false;
		void fetch("/api/auth/session", { credentials: "include" })
			.then(async (res) => {
				if (cancelled) return;
				if (!res.ok) {
					setAuthState("guest");
					return;
				}
				const data = (await res.json()) as { valid?: boolean };
				setAuthState(data.valid ? "caalm" : "guest");
			})
			.catch(() => {
				if (!cancelled) setAuthState("guest");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const statusHref =
		resourceType && resourceId
			? `/esign/prepare/${resourceType}/${resourceId}`
			: "/dashboard";

	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
			<CheckCircle2 className="h-12 w-12 text-green" />
			<h1 className="mt-4 text-xl font-semibold sidebar-gradient-text">
				{declined ? "You declined this document" : "You're all set"}
			</h1>
			<p className="mt-2 w-full max-w-3xl text-sm text-slate-600 text-balance">
				{title}
			</p>
			<p className="mt-2 max-w-3xl text-sm text-slate-500">
				{declined
					? "The sender can see that you declined. You can close this tab."
					: "Your response was recorded. Download a copy for your records, then you can close this tab."}
			</p>
			<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
				{!declined && documentUrl ? (
					<Button asChild className="primary-btn px-3 sm:px-4">
						<a href={documentUrl} download>
							<CloudDownload className="h-4 w-4" />
							Download PDF
						</a>
					</Button>
				) : null}
				{authState === "caalm" ? (
					<Button asChild className="primary-btn px-3 sm:px-4">
						<Link href={statusHref}>
							<FileSearch className="h-4 w-4" />
							View signing status
						</Link>
					</Button>
				) : null}
				{authState === "loading" ? (
					<p className="w-full text-xs text-slate-400">Checking your CAALM session…</p>
				) : null}
			</div>
			{authState === "guest" ? (
				<p className="mt-4 max-w-md text-xs text-slate-500">
					{declined
						? "No further action is needed on your side."
						: "If other people still need to sign, you may get an email when the package is fully complete."}
				</p>
			) : null}
		</div>
	);
}
