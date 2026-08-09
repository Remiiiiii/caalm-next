"use client";

import { Moon, Sun } from "lucide-react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { cn } from "@/lib/utils";

export type DocsTheme = "light" | "dark";

const STORAGE_KEY = "caalm-docs-theme";

type DocsThemeContextValue = {
	theme: DocsTheme;
	toggle: () => void;
	setTheme: (theme: DocsTheme) => void;
};

const DocsThemeContext = createContext<DocsThemeContextValue | null>(null);

export function useDocsTheme() {
	const ctx = useContext(DocsThemeContext);
	if (!ctx) {
		throw new Error("useDocsTheme must be used within DocsThemeProvider");
	}
	return ctx;
}

export function DocsThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<DocsTheme>("light");

	useEffect(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (stored === "dark" || stored === "light") {
			setThemeState(stored);
			return;
		}
		if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
			setThemeState("dark");
		}
	}, []);

	useEffect(() => {
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
		window.localStorage.setItem(STORAGE_KEY, theme);
		return () => {
			root.classList.remove("dark");
		};
	}, [theme]);

	const setTheme = useCallback((next: DocsTheme) => {
		setThemeState(next);
	}, []);

	const toggle = useCallback(() => {
		setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
	}, []);

	return (
		<DocsThemeContext.Provider value={{ theme, toggle, setTheme }}>
			{children}
		</DocsThemeContext.Provider>
	);
}

export function DocsThemeToggle({ className }: { className?: string }) {
	const { theme, toggle } = useDocsTheme();
	const isDark = theme === "dark";

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			title={isDark ? "Light mode" : "Dark mode"}
			className={cn(
				"inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600",
				"transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				"dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
				"dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white",
				className,
			)}
		>
			{isDark ? (
				<Sun className="h-4 w-4" aria-hidden />
			) : (
				<Moon className="h-4 w-4" aria-hidden />
			)}
		</button>
	);
}
