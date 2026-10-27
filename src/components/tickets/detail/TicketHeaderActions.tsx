"use client";

import { Check, ExternalLink, Link2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TicketHeaderActions({
	githubIssueUrl,
}: {
	githubIssueUrl?: string | null;
}) {
	const [copied, setCopied] = useState(false);

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard can be blocked; the URL bar still has the link.
		}
	};

	return (
		<div className="flex items-center gap-1">
			<Button
				type="button"
				variant="ghost"
				className="text-slate-500 hover:bg-black/[.04]"
				onClick={() => void copyLink()}
			>
				{copied ? (
					<Check className="h-4 w-4" aria-hidden />
				) : (
					<Link2 className="h-4 w-4" aria-hidden />
				)}
				{copied ? "Copied" : "Copy link"}
			</Button>
			{githubIssueUrl ? (
				<Button
					asChild
					variant="ghost"
					className="text-slate-500 hover:bg-black/[.04]"
				>
					<a href={githubIssueUrl} target="_blank" rel="noreferrer">
						<ExternalLink className="h-4 w-4" aria-hidden />
						GitHub issue
					</a>
				</Button>
			) : null}
		</div>
	);
}
