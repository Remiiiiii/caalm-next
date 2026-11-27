"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";

/** Lets a reviewer vouch for a link the system inferred (an AI-suggested, unconfirmed evidence link) — the detail page is a server component, so this is the one bit of interactivity split out into its own client component. */
export function ConfirmEvidenceLinkButton({ linkId }: { linkId: string }) {
	const router = useRouter();
	const { toast } = useToast();
	const [busy, setBusy] = useState(false);

	return (
		<button
			type="button"
			disabled={busy}
			className="shrink-0 cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
			onClick={async () => {
				setBusy(true);
				try {
					const res = await fetch("/api/audit-lab/evidence", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ action: "confirm_link", linkId }),
					});
					const json = (await res.json()) as { error?: string };
					if (!res.ok) throw new Error(json.error || "Request failed");
					router.refresh();
				} catch (err) {
					toast({
						title: "Evidence link",
						description: toUserFacingErrorMessage(
							err,
							"I couldn't confirm this link. Please try again.",
						),
					});
				} finally {
					setBusy(false);
				}
			}}
		>
			{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
		</button>
	);
}
