"use client";

import { CheckCircle2, Loader2, MessageSquareWarning, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ApprovalDecision } from "@/lib/approvals/contractApprovalWorkflow.types";

export default function ApproveByTokenPage() {
	const params = useParams<{ token: string }>();
	const token = params?.token;
	const [ready, setReady] = useState(false);
	const [entityType, setEntityType] = useState<"contract" | "license">(
		"contract",
	);
	const [entityName, setEntityName] = useState("this item");
	const [error, setError] = useState<string | null>(null);
	const [notes, setNotes] = useState("");
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState<string | null>(null);

	useEffect(() => {
		if (!token) return;
		void fetch(`/api/approve/${encodeURIComponent(token)}`)
			.then(async (res) => {
				const json = await res.json();
				if (!res.ok) throw new Error(json.error || "Invalid link");
				setEntityType(json.entityType === "license" ? "license" : "contract");
				setEntityName(json.entityName || "this item");
				setReady(true);
			})
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : "Invalid link");
			});
	}, [token]);

	const submit = async (decision: ApprovalDecision) => {
		if (!token) return;
		if (
			(decision === "rejected" || decision === "changes_requested") &&
			!notes.trim()
		) {
			setError("Add a note for reject or request changes.");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const res = await fetch(`/api/approve/${encodeURIComponent(token)}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ decision, notes }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Decision failed");
			setDone(json.contractStatus || "updated");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Decision failed");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
			<h1 className="h1 sidebar-gradient-text mb-2">Review this approval</h1>
			<p className="mb-6 text-sm text-slate-600">
				{ready
					? `Decide on ${entityType} “${entityName}”. This link is unique to you and expires after use.`
					: "This link is unique to you and expires after use."}
			</p>
			{error ? (
				<p className="mb-4 rounded-lg border border-red/20 bg-red/5 p-3 text-sm text-red">
					{error}
				</p>
			) : null}
			{done ? (
				<p className="rounded-lg border border-green/20 bg-green/5 p-3 text-sm text-green">
					Decision recorded. Status: {done}
				</p>
			) : ready ? (
				<div className="space-y-4">
					<Textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Notes (required for reject or request changes)"
						className="min-h-[88px] border-[0.25px] border-slate-300"
					/>
					<div className="flex flex-wrap justify-end gap-2">
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={busy}
							onClick={() => void submit("rejected")}
						>
							<XCircle className="h-4 w-4" />
							Reject
						</Button>
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={busy}
							onClick={() => void submit("changes_requested")}
						>
							<MessageSquareWarning className="h-4 w-4" />
							Request changes
						</Button>
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={busy}
							onClick={() => void submit("approved")}
						>
							{busy ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<CheckCircle2 className="h-4 w-4" />
							)}
							Approve
						</Button>
					</div>
				</div>
			) : (
				<p className="flex items-center text-sm text-slate-500">
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Checking link…
				</p>
			)}
		</div>
	);
}
