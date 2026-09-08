"use client";

import type { DocumentMetadataEntry } from "@/lib/contracts/negotiation/document-model";

interface NegotiationMetaCardProps {
	entries: DocumentMetadataEntry[];
}

/** Friendlier labels when the snapshot still uses wizard merge-tag names. */
const LABEL_ALIASES: Record<string, string> = {
	"Other party": "Grantee / other party",
	Start: "Effective date",
	Expiry: "Expiry date",
	Value: "Grant / contract value",
};

/** Contract facts as a card — keeps merge-tag output out of the prose. */
export function NegotiationMetaCard({ entries }: NegotiationMetaCardProps) {
	if (entries.length === 0) return null;
	return (
		<div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
			<div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
				{entries.map((entry) => (
					<div
						key={entry.label}
						className="flex items-baseline justify-between gap-3 text-xs"
					>
						<span className="text-slate-500">
							{LABEL_ALIASES[entry.label] || entry.label}
						</span>
						<span className="text-right font-semibold text-slate-700 tabular-nums">
							{entry.value}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
