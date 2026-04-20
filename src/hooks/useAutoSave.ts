import { useCallback, useEffect, useRef, useState } from "react";

interface AutoSaveData {
	[key: string]: any;
}

interface UseAutoSaveOptions {
	debounceMs?: number;
	localStorageKey?: string;
	enabled?: boolean;
}

export function useAutoSave(
	data: AutoSaveData,
	id: string,
	hasChanges: boolean,
	onSave: (data: AutoSaveData) => Promise<void>,
	options: UseAutoSaveOptions = {},
) {
	const {
		debounceMs = 30000, // 30 seconds
		localStorageKey = `article-draft-${id}`,
		enabled = true,
	} = options;

	const [isSaving, setIsSaving] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const previousDataRef = useRef<string>("");

	// Save to localStorage as backup
	const saveToLocalStorage = useCallback(
		(dataToSave: AutoSaveData) => {
			try {
				localStorage.setItem(localStorageKey, JSON.stringify(dataToSave));
			} catch (error) {
				console.warn("Failed to save to localStorage:", error);
			}
		},
		[localStorageKey],
	);

	// Load from localStorage
	const loadFromLocalStorage = useCallback((): AutoSaveData | null => {
		try {
			const saved = localStorage.getItem(localStorageKey);
			return saved ? JSON.parse(saved) : null;
		} catch (error) {
			console.warn("Failed to load from localStorage:", error);
			return null;
		}
	}, [localStorageKey]);

	// Perform save
	const performSave = useCallback(
		async (dataToSave: AutoSaveData) => {
			if (!enabled || !hasChanges) return;

			setIsSaving(true);
			try {
				await onSave(dataToSave);
				setLastSaved(new Date());
				saveToLocalStorage(dataToSave);
				previousDataRef.current = JSON.stringify(dataToSave);
			} catch (error) {
				console.error("Auto-save failed:", error);
				// Still save to localStorage as backup
				saveToLocalStorage(dataToSave);
			} finally {
				setIsSaving(false);
			}
		},
		[enabled, hasChanges, onSave, saveToLocalStorage],
	);

	// Debounced save
	useEffect(() => {
		if (!enabled || !hasChanges) return;

		const dataString = JSON.stringify(data);
		if (dataString === previousDataRef.current) return;

		// Clear existing timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		// Set new timeout
		timeoutRef.current = setTimeout(() => {
			performSave(data);
		}, debounceMs);

		// Cleanup
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [data, debounceMs, enabled, hasChanges, performSave]);

	// Load from localStorage on mount (for new articles)
	useEffect(() => {
		if (id === "new") {
			const saved = loadFromLocalStorage();
			if (saved) {
				// Restore data - this would need to be handled by parent component
				// For now, we just indicate that there's a saved draft
				console.log("Found saved draft in localStorage");
			}
		}
	}, [id, loadFromLocalStorage]);

	// Cleanup localStorage when article is saved successfully
	const clearDraft = useCallback(() => {
		try {
			localStorage.removeItem(localStorageKey);
			previousDataRef.current = "";
		} catch (error) {
			console.warn("Failed to clear localStorage:", error);
		}
	}, [localStorageKey]);

	return {
		isSaving,
		lastSaved,
		clearDraft,
		loadFromLocalStorage,
	};
}
