"use client";

import { useEffect, useState } from "react";
import {
	convertToUsd,
	fetchUsdRate,
	formatUsdAmount,
	normalizeCurrencyCode,
	parseMoneyAmount,
} from "@/lib/currency";

type ConversionState = {
	label: string | null;
	loading: boolean;
};

export function useUsdConversion(
	amount: string | number | undefined | null,
	currencyCode?: string | null,
): ConversionState {
	const code = normalizeCurrencyCode(currencyCode);
	const parsed = parseMoneyAmount(amount);
	const [label, setLabel] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (code === "USD" || parsed === null) {
			setLabel(null);
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		void fetchUsdRate(code)
			.then((rate) => {
				if (cancelled) return;
				const usd = convertToUsd(parsed, rate);
				setLabel(`${formatUsdAmount(usd)} USD`);
				setLoading(false);
			})
			.catch(() => {
				if (cancelled) return;
				setLabel(null);
				setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [code, parsed]);

	return { label, loading };
}
