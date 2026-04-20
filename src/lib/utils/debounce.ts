/**
 * Debounce utility for optimizing search and other user input
 */

type DebounceFunction<T extends (...args: any[]) => any> = (
	...args: Parameters<T>
) => void;

/**
 * Create a debounced function
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @param immediate Whether to execute immediately on first call
 * @returns A debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
	immediate = false,
): DebounceFunction<T> {
	let timeout: NodeJS.Timeout | null = null;
	let result: ReturnType<T>;

	const debounced = (...args: Parameters<T>) => {
		const later = () => {
			timeout = null;
			if (!immediate) result = func(...args);
		};

		const callNow = immediate && !timeout;

		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(later, wait);

		if (callNow) result = func(...args);

		return result;
	};

	// Add cancel method
	(debounced as any).cancel = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
	};

	return debounced;
}

/**
 * Throttle utility for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number,
): DebounceFunction<T> {
	let inThrottle: boolean;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}
