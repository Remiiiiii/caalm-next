/**
 * Global SWR configuration for optimal performance
 */

import type { SWRConfiguration } from "swr";

/**
 * Default SWR fetcher with error handling
 */
export const fetcher = async (url: string) => {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

		const res = await fetch(url, {
			cache: "no-store",
			headers: {
				"x-no-cache": "1",
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!res.ok) {
			let errorMessage = "An error occurred while fetching the data.";
			let errorDetails: any = null;

			try {
				const errorText = await res.text();
				if (errorText) {
					try {
						const errorData = JSON.parse(errorText);
						// Handle different error response formats
						if (errorData.error) {
							errorMessage = errorData.error;
						} else if (errorData.message) {
							errorMessage = errorData.message;
						} else if (typeof errorData === "string") {
							errorMessage = errorData;
						} else {
							errorMessage = res.statusText || errorMessage;
						}
						errorDetails = errorData;
					} catch {
						// Not JSON, use raw text
						errorMessage = errorText || res.statusText || errorMessage;
						errorDetails = { raw: errorText };
					}
				} else {
					errorMessage = res.statusText || errorMessage;
				}
			} catch (_parseError) {
				// If reading response fails, use status text
				errorMessage = res.statusText || errorMessage;
			}

			const error = new Error(errorMessage);
			(error as any).status = res.status;
			(error as any).details = errorDetails;
			(error as any).response = res;
			throw error;
		}

		return res.json();
	} catch (fetchError: any) {
		// Handle network errors, timeouts, and other fetch failures
		if (fetchError.name === "AbortError") {
			const timeoutError = new Error(
				"Request timeout - the server took too long to respond",
			);
			(timeoutError as any).status = 408;
			(timeoutError as any).isTimeout = true;
			throw timeoutError;
		}

		if (
			fetchError instanceof TypeError &&
			fetchError.message.includes("fetch")
		) {
			const networkError = new Error(
				"Network error - please check your connection",
			);
			(networkError as any).status = 0;
			(networkError as any).isNetworkError = true;
			throw networkError;
		}

		// Re-throw if it's already an Error with status (from above)
		if (fetchError.status) {
			throw fetchError;
		}

		// Wrap unknown errors
		const wrappedError = new Error(
			fetchError?.message || "An unexpected error occurred while fetching data",
		);
		(wrappedError as any).status = fetchError?.status || 500;
		(wrappedError as any).originalError = fetchError;
		throw wrappedError;
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
	revalidateOnFocus: true, // Revalidate when window gets focused
	revalidateOnReconnect: true, // Revalidate when network recovers
	dedupingInterval: 2000, // Dedupe requests within 2 seconds
	focusThrottleInterval: 5000, // Throttle revalidation on focus (5 seconds)
	errorRetryCount: 3, // Retry failed requests 3 times
	errorRetryInterval: 5000, // Wait 5 seconds between retries
	shouldRetryOnError: (error: any) => {
		// Don't retry on 4xx errors (client errors)
		if (error?.status >= 400 && error?.status < 500) {
			return false;
		}
		return true;
	},
	onError: (error, key) => {
		// Defensive error handling - handle edge cases where error might be malformed
		let errorMessage = "Unknown error";
		let status: number | string = "unknown";
		let details: any = null;
		let errorType = typeof error;

		// Check if error is actually the key (edge case)
		if (error === key || (typeof error === "string" && error === key)) {
			errorMessage = `Request failed for ${key}`;
			errorType = "object";
			status = "unknown";
		} else if (typeof error === "string") {
			// If error is a string but not the key, use it as message
			errorMessage = error;
			status = "unknown";
		} else if (error instanceof Error) {
			errorMessage = error.message || "Unknown error";
			status = (error as any).status ?? "unknown";
			details = (error as any).details ?? null;
		} else if (error && typeof error === "object") {
			// Safely extract error properties
			try {
				const errorObj = error as any;
				// Check if all properties are the same string (malformed error object)
				const props = Object.keys(errorObj);
				if (props.length > 0) {
					const firstValue = errorObj[props[0]];
					const allSame = props.every((prop) => errorObj[prop] === firstValue);
					if (allSame && typeof firstValue === "string") {
						// Malformed error object where all properties are the same string
						errorMessage = `Request failed for ${key}: ${firstValue}`;
						errorType = "object";
						status = "unknown";
					} else {
						errorMessage =
							errorObj.message ||
							errorObj.error ||
							errorObj.toString?.() ||
							"Unknown error";
						status = errorObj.status ?? "unknown";
						details = errorObj.details ?? null;
					}
				} else {
					errorMessage = "Empty error object";
				}
			} catch (_e) {
				// If accessing properties fails, use fallback
				errorMessage = "Error object could not be parsed";
				status = "unknown";
			}
		} else if (error === null || error === undefined) {
			errorMessage = "Error was null or undefined";
			errorType = "object";
			status = "unknown";
		}

		// Only log non-4xx errors to avoid noise from authentication/authorization issues
		if (typeof status === "number" && status < 400) {
			return; // Don't log non-error responses
		}

		// Build error info object with safe values - ensure no field is the key string
		const errorInfo: {
			key: string;
			error: string;
			status: number | string;
			details?: any;
			errorType: string;
			rawError?: any;
		} = {
			key: String(key || "unknown-key"),
			error:
				errorMessage !== key
					? String(errorMessage || "Unknown error")
					: "Request failed",
			status: status !== key ? status : "unknown",
			errorType: String(errorType || "unknown"),
		};

		// Only add details if they exist and are not circular
		if (details !== null && details !== undefined) {
			try {
				// Try to serialize to check if it's safe
				JSON.stringify(details);
				errorInfo.details = details;
			} catch {
				// If serialization fails, don't include details
				errorInfo.details = "[Non-serializable details]";
			}
		}

		// Only include raw error in development
		if (process.env.NODE_ENV === "development") {
			try {
				JSON.stringify(error);
				errorInfo.rawError = error;
			} catch {
				errorInfo.rawError = "[Non-serializable error]";
			}
		}

		// Never log the key string in any field (SWR can pass key as error in edge cases)
		const keyStr = String(key || "unknown-key");
		const isKey = (v: unknown) => v === keyStr || v === key;
		if (isKey(errorInfo.error)) errorInfo.error = "Request failed";
		if (isKey(errorInfo.status)) errorInfo.status = "unknown";
		if (isKey(errorInfo.errorType)) errorInfo.errorType = "unknown";
		if (errorInfo.details !== undefined && isKey(errorInfo.details)) {
			errorInfo.details = "[omitted]";
		}
		if (errorInfo.rawError !== undefined && isKey(errorInfo.rawError)) {
			errorInfo.rawError = "[omitted]";
		}

		console.error("SWR Error:", errorInfo);
	},
};

/**
 * SWR configuration for real-time data (short refresh interval)
 */
export const realTimeConfig: SWRConfiguration = {
	...swrConfig,
	refreshInterval: 30000, // Refresh every 30 seconds
	revalidateOnFocus: true,
};

/**
 * SWR configuration for static data (long refresh interval)
 */
export const staticConfig: SWRConfiguration = {
	...swrConfig,
	revalidateOnFocus: false, // Don't refetch on focus for static data
	revalidateOnReconnect: false,
	dedupingInterval: 60000, // Dedupe for 1 minute
};

/**
 * SWR configuration for frequently changing data
 */
export const frequentConfig: SWRConfiguration = {
	...swrConfig,
	refreshInterval: 5000, // Refresh every 5 seconds
	dedupingInterval: 1000, // Dedupe for 1 second
};
