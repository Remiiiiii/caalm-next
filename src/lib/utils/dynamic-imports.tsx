/**
 * Utilities for dynamic imports and code splitting
 */

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { LoadingSpinner } from "@/components/ui/loading";

/**
 * Lazy loading component with custom fallback
 */
export function lazyLoad<T extends ComponentType<any>>(
	importFn: () => Promise<{ default: T }>,
	fallback?: ReactNode,
) {
	return dynamic(importFn, {
		ssr: false,
		loading: () =>
			fallback || (
				<div className="flex items-center justify-center p-8">
					<LoadingSpinner size="md" label="Loading..." className="!p-0" />
				</div>
			),
	});
}

/**
 * Lazy load modal components (modals are typically not needed on initial load)
 */
export function lazyLoadModal<T extends ComponentType<any>>(
	importFn: () => Promise<{ default: T }>,
) {
	return dynamic(importFn, {
		ssr: false,
		loading: () => null, // Modals don't need a loading state
	});
}

/**
 * Lazy load heavy components
 */
export function lazyLoadHeavy<T extends ComponentType<any>>(
	importFn: () => Promise<{ default: T }>,
	placeholder?: ReactNode,
) {
	return dynamic(importFn, {
		ssr: false,
		loading: () =>
			placeholder || (
				<div className="flex items-center justify-center p-8">
					<LoadingSpinner size="md" label="Loading..." className="!p-0" />
				</div>
			),
	});
}

/**
 * Preload a component (useful for prefetching on hover)
 */
export function preloadComponent(importFn: () => Promise<any>) {
	return () => {
		importFn();
	};
}
