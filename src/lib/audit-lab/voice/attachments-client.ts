import type { AttachmentSource } from "@/lib/audit-lab/types";

/** Starts an evidence-attachment upload from any of the three entry points (stage drop, rubric-item control, floating widget) — all post to the same route, distinguished only by `source`. */
export async function uploadInterviewAttachment(
	attemptId: string,
	file: File,
	opts: { source: AttachmentSource; questionId?: string; replyToText?: string },
): Promise<{ rowId: string } | { error: string }> {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("source", opts.source);
	if (opts.questionId) formData.append("questionId", opts.questionId);
	if (opts.replyToText) formData.append("replyToText", opts.replyToText);
	const res = await fetch(`/api/audit-lab/practice/${attemptId}/attachments`, {
		method: "POST",
		body: formData,
	});
	const json = await res.json().catch(() => ({}));
	if (!res.ok || json?.error) {
		return { error: json?.error ?? "Could not attach that file." };
	}
	return { rowId: json.data.rowId };
}

/** Attaches a file already in the org's document repository (picked via the "send to interview" action on /documents etc.) instead of uploading bytes from the browser — the server fetches the file from storage itself. */
export async function attachRepositoryFile(
	attemptId: string,
	fileId: string,
	opts: { questionId?: string; replyToText?: string } = {},
): Promise<{ rowId: string } | { error: string }> {
	const res = await fetch(
		`/api/audit-lab/practice/${attemptId}/attachments/from-repository`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				fileId,
				questionId: opts.questionId,
				replyToText: opts.replyToText,
			}),
		},
	);
	const json = await res.json().catch(() => ({}));
	if (!res.ok || json?.error) {
		return { error: json?.error ?? "Could not attach that file." };
	}
	return { rowId: json.data.rowId };
}

/** Retries a failed attachment in place (same row) with a re-picked file — covers both an upload failure (needs the bytes resent) and a scan failure (user may pick a different file). */
export async function retryInterviewAttachment(
	attemptId: string,
	rowId: string,
	file: File,
): Promise<{ ok: true } | { error: string }> {
	const formData = new FormData();
	formData.append("file", file);
	const res = await fetch(
		`/api/audit-lab/practice/${attemptId}/attachments/${rowId}/retry`,
		{ method: "PATCH", body: formData },
	);
	const json = await res.json().catch(() => ({}));
	if (!res.ok || json?.error) {
		return { error: json?.error ?? "Could not retry that attachment." };
	}
	return { ok: true };
}
