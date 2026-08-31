"use client";

import { EqualApproximately } from "lucide-react";
import { useUsdConversion } from "@/hooks/useUsdConversion";

type UsdConversionHintProps = {
	amount: string | number | undefined | null;
	currencyCode?: string | null;
};

export function UsdConversionHint({
	amount,
	currencyCode,
}: UsdConversionHintProps) {
	const { label, loading } = useUsdConversion(amount, currencyCode);
	if (!label && !loading) return null;

	return (
		<p
			className="flex shrink-0 items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap"
			aria-label={label ? `Approximately ${label}` : undefined}
		>
			{loading ? (
				"Converting to USD…"
			) : (
				<>
					<EqualApproximately
						className="h-5 w-5 text-slate-500"
						aria-hidden
					/>
					<span>{label}</span>
				</>
			)}
		</p>
	);
}
