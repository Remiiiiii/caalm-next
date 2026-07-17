"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import type { UIFileDoc } from "@/types/files";
import {
	type ContractFilters,
	type DensityMode,
	type SavedContractView,
	type StatusTab,
	type ViewType,
	DENSITY_STORAGE_KEY,
	SAVED_VIEWS_STORAGE_KEY,
	VIEW_STORAGE_KEY,
	deserializeFilters,
	serializeFilters,
} from "@/lib/contracts/contractsListUtils";

interface ContractsViewContextType {
	view: ViewType;
	handleViewChange: (view: ViewType) => void;
	filters: ContractFilters;
	setFilters: React.Dispatch<React.SetStateAction<ContractFilters>>;
	clearFilters: () => void;
	statusTab: StatusTab;
	setStatusTab: (tab: StatusTab) => void;
	selectedIds: string[];
	toggleSelected: (id: string) => void;
	selectAll: (ids: string[]) => void;
	clearSelection: () => void;
	density: DensityMode;
	setDensity: (density: DensityMode) => void;
	previewFile: UIFileDoc | null;
	setPreviewFile: (file: UIFileDoc | null) => void;
	savedViews: SavedContractView[];
	saveCurrentView: (name: string) => void;
	applySavedView: (view: SavedContractView) => void;
	deleteSavedView: (id: string) => void;
	listAnchorRef: React.RefObject<HTMLDivElement | null>;
	scrollToList: () => void;
}

const ContractsViewContext = createContext<
	ContractsViewContextType | undefined
>(undefined);

const emptyFilters = (): ContractFilters => ({});

export function ContractsViewProvider({ children }: { children: ReactNode }) {
	const [view, setView] = useState<ViewType>("table");
	const [filters, setFilters] = useState<ContractFilters>({});
	const [statusTab, setStatusTabState] = useState<StatusTab>("all");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [density, setDensityState] = useState<DensityMode>("comfortable");
	const [previewFile, setPreviewFile] = useState<UIFileDoc | null>(null);
	const [savedViews, setSavedViews] = useState<SavedContractView[]>([]);
	const listAnchorRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const savedView = localStorage.getItem(VIEW_STORAGE_KEY) as ViewType | null;
		if (savedView === "table" || savedView === "card") {
			setView(savedView);
		} else {
			setView("table");
			localStorage.setItem(VIEW_STORAGE_KEY, "table");
		}
		const savedDensity = localStorage.getItem(
			DENSITY_STORAGE_KEY,
		) as DensityMode | null;
		if (savedDensity === "comfortable" || savedDensity === "compact") {
			setDensityState(savedDensity);
		}
		try {
			const raw = localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as SavedContractView[];
				if (Array.isArray(parsed)) setSavedViews(parsed);
			}
		} catch {
			/* ignore */
		}
	}, []);

	const handleViewChange = useCallback((newView: ViewType) => {
		setView(newView);
		localStorage.setItem(VIEW_STORAGE_KEY, newView);
	}, []);

	const setDensity = useCallback((next: DensityMode) => {
		setDensityState(next);
		localStorage.setItem(DENSITY_STORAGE_KEY, next);
	}, []);

	const setStatusTab = useCallback((tab: StatusTab) => {
		setStatusTabState(tab);
		setSelectedIds([]);
	}, []);

	const clearFilters = useCallback(() => {
		setFilters(emptyFilters());
		setStatusTabState("all");
		setSelectedIds([]);
	}, []);

	const toggleSelected = useCallback((id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	}, []);

	const selectAll = useCallback((ids: string[]) => {
		setSelectedIds(ids);
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedIds([]);
	}, []);

	const persistSavedViews = useCallback((views: SavedContractView[]) => {
		setSavedViews(views);
		localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views));
	}, []);

	const saveCurrentView = useCallback(
		(name: string) => {
			const entry: SavedContractView = {
				id: `view-${Date.now()}`,
				name: name.trim() || "Untitled view",
				statusTab,
				filters: serializeFilters(filters),
				view,
				density,
			};
			persistSavedViews([entry, ...savedViews].slice(0, 12));
		},
		[statusTab, filters, view, density, savedViews, persistSavedViews],
	);

	const applySavedView = useCallback((saved: SavedContractView) => {
		setStatusTabState(saved.statusTab);
		setFilters(deserializeFilters(saved.filters));
		setView(saved.view);
		localStorage.setItem(VIEW_STORAGE_KEY, saved.view);
		setDensityState(saved.density);
		localStorage.setItem(DENSITY_STORAGE_KEY, saved.density);
		setSelectedIds([]);
	}, []);

	const deleteSavedView = useCallback(
		(id: string) => {
			persistSavedViews(savedViews.filter((v) => v.id !== id));
		},
		[savedViews, persistSavedViews],
	);

	const scrollToList = useCallback(() => {
		listAnchorRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	}, [listAnchorRef]);

	const value = useMemo(
		() => ({
			view,
			handleViewChange,
			filters,
			setFilters,
			clearFilters,
			statusTab,
			setStatusTab,
			selectedIds,
			toggleSelected,
			selectAll,
			clearSelection,
			density,
			setDensity,
			previewFile,
			setPreviewFile,
			savedViews,
			saveCurrentView,
			applySavedView,
			deleteSavedView,
			listAnchorRef,
			scrollToList,
		}),
		[
			view,
			handleViewChange,
			filters,
			clearFilters,
			statusTab,
			setStatusTab,
			selectedIds,
			toggleSelected,
			selectAll,
			clearSelection,
			density,
			setDensity,
			previewFile,
			savedViews,
			saveCurrentView,
			applySavedView,
			deleteSavedView,
			listAnchorRef,
			scrollToList,
		],
	);

	return (
		<ContractsViewContext.Provider value={value}>
			{children}
		</ContractsViewContext.Provider>
	);
}

export function useContractsView() {
	const context = useContext(ContractsViewContext);
	if (context === undefined) {
		throw new Error(
			"useContractsView must be used within a ContractsViewProvider",
		);
	}
	return context;
}

export function useContractsFilter() {
	const context = useContractsView();
	return {
		filters: context.filters,
		setFilters: context.setFilters,
		clearFilters: context.clearFilters,
	};
}

// Re-export types used by other modules
export type { ContractFilters, StatusTab, DensityMode, ViewType };
