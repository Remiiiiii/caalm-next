/** BIS most-traded / widely used currencies, always shown in Currency fields. */
export const TOP_CURRENCY_CODES = [
	"USD",
	"EUR",
	"JPY",
	"GBP",
	"CNY",
	"AUD",
	"CAD",
	"CHF",
	"HKD",
	"SGD",
] as const;

export type TopCurrencyCode = (typeof TOP_CURRENCY_CODES)[number];

const CURRENCY_NAMES: Record<string, string> = {
	USD: "US Dollar",
	EUR: "Euro",
	JPY: "Japanese Yen",
	GBP: "British Pound",
	CNY: "Chinese Yuan",
	AUD: "Australian Dollar",
	CAD: "Canadian Dollar",
	CHF: "Swiss Franc",
	HKD: "Hong Kong Dollar",
	SGD: "Singapore Dollar",
};

export type CurrencyOption = {
	code: string;
	name: string;
};

export function normalizeCurrencyCode(code?: string | null): string {
	const next = (code || "USD").trim().toUpperCase();
	if (next === "OTHER") return "USD";
	return next.length === 3 ? next : "USD";
}

export function currencyName(code: string): string {
	const normalized = normalizeCurrencyCode(code);
	return CURRENCY_NAMES[normalized] || normalized;
}

export function currencySelectOptions(current?: string | null): CurrencyOption[] {
	const codes = [...TOP_CURRENCY_CODES] as string[];
	const extra = current ? normalizeCurrencyCode(current) : "";
	if (extra && !codes.includes(extra)) {
		codes.push(extra);
	}
	return codes.map((code) => ({
		code,
		name: currencyName(code),
	}));
}

export function parseMoneyAmount(
	raw: string | number | undefined | null,
): number | null {
	if (raw === undefined || raw === null || raw === "") return null;
	if (typeof raw === "number") {
		return Number.isFinite(raw) ? raw : null;
	}
	const numeric = raw.replace(/[^0-9.-]/g, "");
	if (!numeric) return null;
	const parsed = Number(numeric);
	return Number.isFinite(parsed) ? parsed : null;
}

export function formatUsdAmount(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

export function convertToUsd(amount: number, rate: number): number {
	return Math.round(amount * rate * 100) / 100;
}

const RATE_TTL_MS = 60 * 60 * 1000;
const rateCache = new Map<string, { rate: number; fetchedAt: number }>();

const FRANKFURTER_URL = "https://api.frankfurter.app/latest";

export async function fetchUsdRateFromProvider(from: string): Promise<number> {
	const code = normalizeCurrencyCode(from);
	if (code === "USD") return 1;

	const url = `${FRANKFURTER_URL}?from=${encodeURIComponent(code)}&to=USD`;
	const response = await fetch(url, { next: { revalidate: 3600 } });
	if (!response.ok) {
		throw new Error("Could not load the USD exchange rate");
	}
	const body = (await response.json()) as { rates?: { USD?: number } };
	const rate = body.rates?.USD;
	if (typeof rate !== "number" || rate <= 0) {
		throw new Error("USD exchange rate is missing");
	}
	return rate;
}

export async function fetchUsdRate(from: string): Promise<number> {
	const code = normalizeCurrencyCode(from);
	if (code === "USD") return 1;

	const cached = rateCache.get(code);
	if (cached && Date.now() - cached.fetchedAt < RATE_TTL_MS) {
		return cached.rate;
	}

	const response = await fetch(
		`/api/currency/usd-rate?from=${encodeURIComponent(code)}`,
	);
	if (!response.ok) {
		throw new Error("Could not load the USD exchange rate");
	}
	const body = (await response.json()) as { rate?: number };
	if (typeof body.rate !== "number" || body.rate <= 0) {
		throw new Error("USD exchange rate is missing");
	}
	rateCache.set(code, { rate: body.rate, fetchedAt: Date.now() });
	return body.rate;
}

/** Back-compat alias for older CURRENCY_CODES lists. */
export const CURRENCY_CODES = [...TOP_CURRENCY_CODES];
