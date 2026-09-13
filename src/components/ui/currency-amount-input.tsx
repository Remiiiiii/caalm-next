"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CurrencyAmountInputProps = {
	value?: string;
	onChange: (value: string) => void;
	symbol: string;
	placeholder?: string;
	className?: string;
	id?: string;
};

/** Digits-only money field with a leading currency symbol. */
export function CurrencyAmountInput({
	value,
	onChange,
	symbol,
	placeholder,
	className,
	id,
}: CurrencyAmountInputProps) {
	return (
		<div className="relative">
			<span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-slate-600">
				{symbol}
			</span>
			<Input
				id={id}
				inputMode="decimal"
				placeholder={placeholder}
				value={value ?? ""}
				onChange={(event) => {
					onChange(event.target.value.replace(/[^\d.,-]/g, ""));
				}}
				// glass-form-control sets padding-left in CSS; this attr bumps it to 3rem
				data-with-leading-icon="true"
				className={cn(
					"border-[0.25px] border-slate-300 bg-white",
					className,
				)}
			/>
		</div>
	);
}
