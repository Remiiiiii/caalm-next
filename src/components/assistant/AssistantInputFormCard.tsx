"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import type { AssistantInputForm } from "@/components/assistant/assistantTypes";
import { Button } from "@/components/ui/button";
import { CaalmDatePicker } from "@/components/ui/caalm-date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FIELD_CLASS =
	"border-[0.25px] border-slate-300 bg-white text-sm text-slate-700";

type Props = {
	form: AssistantInputForm;
	onSubmit: (message: string) => void;
	disabled?: boolean;
};

export default function AssistantInputFormCard({
	form,
	onSubmit,
	disabled,
}: Props) {
	const [values, setValues] = useState<Record<string, string>>(() =>
		Object.fromEntries(form.fields.map((f) => [f.name, f.defaultValue ?? ""])),
	);

	function set(name: string, value: string) {
		setValues((prev) => ({ ...prev, [name]: value }));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const lines = form.fields
			.filter((f) => values[f.name]?.trim())
			.map((f) => `${f.label}: ${values[f.name].trim()}`);
		if (!lines.length) return;
		onSubmit(lines.join("\n"));
	}

	const allRequiredFilled = form.fields
		.filter((f) => f.required)
		.every((f) => values[f.name]?.trim());

	return (
		<form onSubmit={handleSubmit} className="mt-2 space-y-3">
			{form.fields.map((field) => (
				<div key={field.name} className="space-y-1">
					<label
						htmlFor={`aif-${field.name}`}
						className={cn(
							"block text-xs font-medium text-slate-600",
							field.required &&
								"after:ml-0.5 after:text-red after:content-['*']",
						)}
					>
						{field.label}
					</label>

					{field.type === "textarea" ? (
						<Textarea
							id={`aif-${field.name}`}
							value={values[field.name]}
							onChange={(e) => set(field.name, e.target.value)}
							placeholder={field.placeholder}
							rows={2}
							disabled={disabled}
							className={cn("min-h-0 resize-none", FIELD_CLASS)}
						/>
					) : field.type === "select" ? (
						<select
							id={`aif-${field.name}`}
							value={values[field.name]}
							onChange={(e) => set(field.name, e.target.value)}
							disabled={disabled}
							className={cn(
								"h-8 w-full rounded-md px-2.5 text-sm focus-visible:outline-none focus-visible:border-[#078FAB] disabled:opacity-50",
								FIELD_CLASS,
							)}
						>
							<option value="">Choose…</option>
							{(field.options ?? []).map((opt) => {
								const s = String(opt);
								return (
									<option key={s} value={s}>
										{s.charAt(0).toUpperCase() + s.slice(1)}
									</option>
								);
							})}
						</select>
					) : field.type === "date" ? (
						<CaalmDatePicker
							id={`aif-${field.name}`}
							value={values[field.name] ?? ""}
							onChange={(value) => set(field.name, value)}
							placeholder={field.placeholder ?? "Pick a date"}
							disabled={disabled}
							size="sm"
						/>
					) : (
						<Input
							id={`aif-${field.name}`}
							type={field.type === "time" ? "time" : "text"}
							value={values[field.name]}
							onChange={(e) => set(field.name, e.target.value)}
							placeholder={field.placeholder}
							disabled={disabled}
							className={cn("h-8", FIELD_CLASS)}
						/>
					)}
				</div>
			))}

			<div className="flex justify-end pt-1">
				<Button
					type="submit"
					size="sm"
					disabled={disabled || !allRequiredFilled}
					className="btn-primary h-8 gap-1.5 px-3 text-xs"
				>
					<Send className="h-3.5 w-3.5" />
					Submit
				</Button>
			</div>
		</form>
	);
}
