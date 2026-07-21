"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

const STORAGE_KEY = "sidebar:collapsed";
const KEYBOARD_SHORTCUT = "b";

type SidebarContextValue = {
	isCollapsed: boolean;
	setCollapsed: (collapsed: boolean) => void;
	toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readStoredCollapsed(): boolean {
	if (typeof window === "undefined") return false;
	try {
		return window.localStorage.getItem(STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

export function SidebarProvider({ children }: { children: ReactNode }) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setIsCollapsed(readStoredCollapsed());
		setHydrated(true);
	}, []);

	const setCollapsed = useCallback((collapsed: boolean) => {
		setIsCollapsed(collapsed);
		try {
			window.localStorage.setItem(STORAGE_KEY, String(collapsed));
		} catch {
			// Ignore quota / private mode errors
		}
	}, []);

	const toggleSidebar = useCallback(() => {
		setCollapsed(!isCollapsed);
	}, [isCollapsed, setCollapsed]);

	useEffect(() => {
		if (!hydrated) return;

		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			const tag = target?.tagName?.toLowerCase();
			if (
				tag === "input" ||
				tag === "textarea" ||
				tag === "select" ||
				target?.isContentEditable
			) {
				return;
			}

			if (
				(event.metaKey || event.ctrlKey) &&
				event.key.toLowerCase() === KEYBOARD_SHORTCUT
			) {
				event.preventDefault();
				setIsCollapsed((prev) => {
					const next = !prev;
					try {
						window.localStorage.setItem(STORAGE_KEY, String(next));
					} catch {
						// Ignore quota / private mode errors
					}
					return next;
				});
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [hydrated]);

	const value = useMemo(
		() => ({
			isCollapsed,
			setCollapsed,
			toggleSidebar,
		}),
		[isCollapsed, setCollapsed, toggleSidebar],
	);

	return (
		<SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
	);
}

export function useSidebarCollapse() {
	const context = useContext(SidebarContext);
	if (!context) {
		throw new Error(
			"useSidebarCollapse must be used within a SidebarProvider.",
		);
	}
	return context;
}
