"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EsignEmailStep({
	message,
	onMessageChange,
}: {
	message: string;
	onMessageChange: (value: string) => void;
}) {
	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-xl font-semibold sidebar-gradient-text">
					Add message
				</h2>
				<p className="mt-1 text-sm text-slate-600">
					Optional note included in the signing invitation email. Leave blank to
					use the default message.
				</p>
			</div>
			<div className="space-y-1">
				<Label htmlFor="esign-message">Message (optional)</Label>
				<Textarea
					id="esign-message"
					className="min-h-32 border-[0.25px] border-slate-300"
					value={message}
					onChange={(e) => onMessageChange(e.target.value)}
				/>
			</div>
			<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
				<p className="mb-2">You can use the following variables in your message:</p>
				<p>
					<code className="rounded bg-slate-100 px-1">{"{signer.name}"}</code>{" "}
					signer full name
				</p>
				<p>
					<code className="rounded bg-slate-100 px-1">{"{signer.email}"}</code>{" "}
					signer email
				</p>
				<p>
					<code className="rounded bg-slate-100 px-1">{"{document.name}"}</code>{" "}
					document title
				</p>
			</div>
		</div>
	);
}
