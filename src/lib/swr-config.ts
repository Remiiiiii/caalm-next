/**
 * Global SWR configuration for optimal performance
 */

import type { SWRConfiguration } from "swr";

type FetcherError = Error & {
	status?: number;
	details?: unknown;
	isTimeout?: boolean;
	isNetworkError?: boolean;
	isAborted?: boolean;
};

function createFetcherError(
	message: string,
	status?: number,
	extras?: Partial<FetcherError>,
): FetcherError {
	const error = new Error(message) as FetcherError;
	if (typeof status === "number") error.status = status;
	if (extras) Object.assign(error, extras);
	return error;
}

/**
 * Default SWR fetcher with error handling
 */
export const fetcher = async (url: string) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 30000);

	try {
		const res = await fetch(url, {
			credentials: "same-origin",
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!res.ok) {
			let errorMessage = res.statusText || "Request failed";
			let errorDetails: unknown = null;

			try {
				const errorText = await res.text();
				if (errorText) {
					try {
						const errorData = JSON.parse(errorText) as {
							error?: string;
							message?: string;
						};
						errorMessage =
							errorData.error ||
							errorData.message ||
							(typeof errorData === "string" ? errorData : errorMessage);
						errorDetails = errorData;
					} catch {
						errorMessage = errorText || errorMessage;
						errorDetails = { raw: errorText };
					}
				}
			} catch {
				// keep status text
			}

			throw createFetcherError(errorMessage, res.status, {
				details: errorDetails,
			});
		}

		// Empty body (204 / empty 200) → null
		const text = await res.text();
		if (!text) return null;
		return JSON.parse(text);
	} catch (fetchError: unknown) {
		clearTimeout(timeoutId);

		const err = fetchError as FetcherError;

		// Already normalized
		if (err instanceof Error && typeof err.status === "number") {
			throw err;
		}

		if (err instanceof Error && err.name === "AbortError") {
			// Distinguish our timeout from browser/SWR aborts via message when possible.
			throw createFetcherError(
				"Request timeout - the server took too long to respond",
				408,
				{ isTimeout: true, isAborted: true },
			);
		}

		if (
			err instanceof TypeError &&
			typeof err.message === "string" &&
			err.message.toLowerCase().includes("fetch")
		) {
			throw createFetcherError("Network error - please check your connection", 0, {
				isNetworkError: true,
			});
		}

		throw createFetcherError(
			err instanceof Error ? err.message : "Unexpected fetch error",
			500,
		);
	}
};

/**
 * SWR key generators for consistent caching
 */
export const swrKeys = {
	currentUser: () => "/api/user/current",
	users: (orgId: string | null | undefined) =>
		orgId ? `/api/users?orgId=${encodeURIComponent(orgId)}` : null,
	calendarEvents: (year: number, month: number) =>
		`/api/calendar/events?year=${year}&month=${month}`,
	managerContracts: (userId: string) => `/api/contracts/manager/${userId}`,
	allContracts: () => "/api/contracts/all",
	recentActivities: (limit: number = 15) =>
		`/api/recent-activities?limit=${limit}`,
	adminStats: () => "/api/admin/stats",
};

/**
 * Global SWR configuration
 */
export const swrConfig: SWRConfiguration = {
	fetcher,
	revalidateOnFocus: false,
	revalidateOnReconnect: true,
	dedupingInterval: 10000,
	focusThrottleInterval: 30000,
	errorRetryCount: 2,
	errorRetryInterval: 5000,
	shouldRetryOnError: (error: unknown) => {
		const status = (error as FetcherError)?.status;
		// Don't retry client / auth errors
		if (typeof status === "number" && status >= 400 && status < 500) {
			return false;
		}
		// Don't retry aborts/timeouts aggressively
		if ((error as FetcherError)?.isAborted) {
			return false;
		}
		return true;
	},
	onError: (error, key) => {
		const status = (error as FetcherError)?.status;
		const message =
			error instanceof Error
				? error.message
				: typeof error === "string"
					? error
					: "Unknown error";

		// Expected auth/permission failures — keep the console clean
		if (typeof status === "number" && status >= 400 && status < 500) {
			return;
		}

		// Avoid Next overlay mangling by logging primitives only
		console.error(
			`[SWR] ${typeof key === "string" ? key : JSON.stringify(key)} → ${message}`,
			typeof status === "number" ? `(${status})` : "",
		);
	},
};

/**
 * SWR configuration for real-time data (short refresh interval)
 */
export const realTimeConfig: SWRConfiguration = {
	...swrConfig,
	refreshInterval: 30000,
	revalidateOnFocus: true,
};

/**
 * SWR configuration for static data (long refresh interval)
 */
export const staticConfig: SWRConfiguration = {
	...swrConfig,
	revalidateOnFocus: false,
	revalidateOnReconnect: false,
	dedupingInterval: 60000,
};

/**
 * SWR configuration for frequently changing data
 */
export const frequentConfig: SWRConfiguration = {
	...swrConfig,
	refreshInterval: 5000,
	dedupingInterval: 1000,
};
