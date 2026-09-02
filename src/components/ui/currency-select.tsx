"use client";

import { CountryFlag } from "currency-code-to-country-flag";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { UsdConversionHint } from "@/components/ui/usd-conversion-hint";
import { currencySelectOptions, normalizeCurrencyCode } from "@/lib/currency";
import { cn } from "@/lib/utils";

type CurrencySelectProps = {
	value?: string;
	onValueChange: (code: string) => void;
	amount?: string | number | null;
	disabled?: boolean;
	triggerClassName?: string;
	placeholder?: string;
};

function CurrencyRow({ code, name }: { code: string; name: string }) {
	return (
		<span className="flex items-center gap-2">
			<CountryFlag
				currency={code}
				size="16"
				ratio="rectangle"
				alt=""
				className="shrink-0 overflow-hidden rounded-[2px]"
			/>
			<span className="font-medium tabular-nums">{code}</span>
			<span className="truncate text-slate-500">{name}</span>
		</span>
	);
}

export function CurrencySelect({
	value,
	onValueChange,
	amount,
	disabled,
	triggerClassName,
	placeholder = "Select currency",
}: CurrencySelectProps) {
	const code = normalizeCurrencyCode(value);
	const options = currencySelectOptions(code);

	return (
		<div className="flex items-center gap-3">
			<div className="min-w-0 flex-1">
				<Select value={code} onValueChange={onValueChange} disabled={disabled}>
					<SelectTrigger className={cn(triggerClassName)}>
						<SelectValue placeholder={placeholder}>
							{options
								.filter((option) => option.code === code)
								.map((option) => (
									<CurrencyRow
										key={option.code}
										code={option.code}
										name={option.name}
									/>
								))}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{options.map((option) => (
							<SelectItem key={option.code} value={option.code}>
								<CurrencyRow code={option.code} name={option.name} />
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<UsdConversionHint amount={amount} currencyCode={code} />
		</div>
	);
}
