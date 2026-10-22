import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";
import { vi } from "vitest";

// findBy*/waitFor default to 1s, which is too tight when the whole suite runs in parallel.
configure({ asyncUtilTimeout: 5000 });

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	}),
	usePathname: () => "/",
	useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
	default: (props: any) => {
		// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
		const React = require("react");
		return React.createElement("img", props);
	},
}));

// Mock SWR
vi.mock("swr", () => ({
	default: vi.fn(() => ({
		data: undefined,
		error: undefined,
		isLoading: false,
		mutate: vi.fn(),
	})),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
	disconnect() {}
	observe() {}
	takeRecords() {
		return [];
	}
	unobserve() {}
} as any;

// Mock global fetch for API calls in components
global.fetch = vi.fn(() =>
	Promise.resolve({
		ok: true,
		status: 200,
		json: async () => ({ success: true }),
		text: async () => "{}",
		headers: new Headers(),
	} as Response),
);
