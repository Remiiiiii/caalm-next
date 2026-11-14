"use client";

import { AlertTriangle } from "lucide-react";
import Avatar from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
	fieldValueEmpty,
	formatFieldDisplayValue,
	type PersonOption,
} from "./reviewFieldUtils";
import type { ReviewField } from "./types";

type ReviewFieldValueProps = {
	field: ReviewField;
	peopleById: Map<string, PersonOption>;
};

export function ReviewFieldValue({ field, peopleById }: ReviewFieldValueProps) {
	const empty = fieldValueEmpty(field.value);

	if (!empty) {
		if (field.format === "person") {
			const ids = Array.isArray(field.value)
				? field.value.map(String)
				: [String(field.value)];
			return (
				<div className="flex flex-wrap items-center gap-2">
					{ids.map((id) => {
						const person = peopleById.get(id);
						const name = person?.name || "Unknown user";
						return (
							<span
								key={id}
								className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700"
							>
								<Avatar
									name={name}
									userId={id}
									size="sm"
									imageUrl={person?.imageUrl ?? undefined}
								/>
								<span>{name}</span>
							</span>
						);
					})}
					{field.source === "extracted" ? (
						<span className="text-[11px] text-slate-500">From document</span>
					) : null}
				</div>
			);
		}

		const text = formatFieldDisplayValue(field, peopleById);
		return (
			<div className="min-w-0 text-sm font-medium text-slate-700">
				<span
					className={cn(field.format === "mono" && "tabular-nums")}
				>
					{text}
				</span>
				{field.source === "extracted" ? (
					<span className="mt-0.5 block text-[11px] font-normal text-slate-500">
						From document
					</span>
				) : null}
			</div>
		);
	}

	if (field.required) {
		const detail =
			field.source === "extracted"
				? "Required, not found in the source file."
				: "Required, not provided.";
		return (
			<div className="flex items-start gap-1.5 text-sm text-orange">
				<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
				<span>{detail}</span>
			</div>
		);
	}

	return (
		<span className="text-sm text-slate-500">Not set, optional</span>
	);
}