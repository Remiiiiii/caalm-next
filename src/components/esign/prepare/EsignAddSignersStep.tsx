"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SignerDraft = { email: string; name: string };

export function EsignAddSignersStep({
	signers,
	onChange,
	onAddMyself,
}: {
	signers: SignerDraft[];
	onChange: (signers: SignerDraft[]) => void;
	onAddMyself: () => void;
}) {
	const update = (index: number, patch: Partial<SignerDraft>) => {
		onChange(signers.map((row, i) => (i === index ? { ...row, ...patch } : row)));
	};

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-xl font-semibold sidebar-gradient-text">
					Add Signers
				</h2>
				<p className="mt-1 text-sm text-slate-600">
					Add the people who will sign the document.
				</p>
			</div>
			{signers.map((signer, index) => (
				<div key={`signer-${index}`} className="flex items-end gap-3">
					<div className="min-w-0 flex-1 space-y-1">
						<Label htmlFor={`esign-email-${index}`}>Email *</Label>
						<Input
							id={`esign-email-${index}`}
							type="email"
							className="border-[0.25px] border-slate-300"
							value={signer.email}
							onChange={(e) => update(index, { email: e.target.value })}
							placeholder="jordan@example.com"
						/>
					</div>
					<div className="min-w-0 flex-1 space-y-1">
						<Label htmlFor={`esign-name-${index}`}>Name</Label>
						<Input
							id={`esign-name-${index}`}
							className="border-[0.25px] border-slate-300"
							value={signer.name}
							onChange={(e) => update(index, { name: e.target.value })}
							placeholder="Jordan Lee"
						/>
					</div>
					<Button
						type="button"
						variant="ghost"
						className="h-10 w-10 p-0 text-slate-500 hover:text-red"
						aria-label={`Remove signer ${index + 1}`}
						onClick={() => onChange(signers.filter((_, i) => i !== index))}
						disabled={signers.length === 1}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			))}
			<div className="flex flex-wrap items-center justify-end gap-3">
				<Button
					type="button"
					className="primary-btn px-3 sm:px-4"
					onClick={() => onChange([...signers, { email: "", name: "" }])}
				>
					<Plus className="h-4 w-4" />
					Add Signer
				</Button>
				<Button
					type="button"
					className="btn-primary px-3 sm:px-4"
					onClick={onAddMyself}
				>
					<Plus className="h-4 w-4" />
					Add myself
				</Button>
				{/* Match trash icon column so buttons align with Name inputs */}
				<div className="h-10 w-10 shrink-0" aria-hidden />
			</div>
		</div>
	);
}
