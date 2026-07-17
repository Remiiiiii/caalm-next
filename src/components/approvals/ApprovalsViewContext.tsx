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
import {
	type ApprovalFilters,
	type ApprovalQueueItem,
	type ApprovalTab,
	type SavedApprovalView,
	APPROVALS_SAVED_VIEWS_KEY,
	deserializeApprovalFilters,
	serializeApprovalFilters,
} from "@/lib/approvals/approvalsListUtils";

interface ApprovalsViewContextType {
	entity: "contract" | "license";
	tab: ApprovalTab;
	setTab: (tab: ApprovalTab) => void;
	filters: ApprovalFilters;
	setFilters: React.Dispatch<React.SetStateAction<ApprovalFilters>>;
	clearFilters: () => void;
	selectedIds: string[];
	toggleSelected: (id: string) => void;
	selectAll: (ids: string[]) => void;
	clearSelection: () => void;
	previewItem: ApprovalQueueItem | null;
	setPreviewItem: (item: ApprovalQueueItem | null) => void;
	savedViews: SavedApprovalView[];
	saveCurrentView: (name: string) => void;
	applySavedView: (view: SavedApprovalView) => void;
	deleteSavedView: (id: string) => void;
	listAnchorRef: React.RefObject<HTMLDivElement | null>;
	scrollToList: () => void;
}

const ApprovalsViewContext = createContext<
	ApprovalsViewContextType | undefined
>(undefined);

export function ApprovalsViewProvider({
	entity,
	children,
}: {
	entity: "contract" | "license";
	children: ReactNode;
}) {
	const storageKey = `${APPROVALS_SAVED_VIEWS_KEY}-${entity}`;
	const [tab, setTabState] = useState<ApprovalTab>("needs-me");
	const [filters, setFilters] = useState<ApprovalFilters>({});
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [previewItem, setPreviewItem] = useState<ApprovalQueueItem | null>(
		null,
	);
	const [savedViews, setSavedViews] = useState<SavedApprovalView[]>([]);
	const listAnchorRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(storageKey);
			if (raw) {
				const parsed = JSON.parse(raw) as SavedApprovalView[];
				if (Array.isArray(parsed)) setSavedViews(parsed);
			}
		} catch {
			/* ignore */
		}
	}, [storageKey]);

	const setTab = useCallback((next: ApprovalTab) => {
		setTabState(next);
		setSelectedIds([]);
	}, []);

	const clearFilters = useCallback(() => {
		setFilters({});
		setTabState("needs-me");
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

	const persistSavedViews = useCallback(
		(views: SavedApprovalView[]) => {
			setSavedViews(views);
			localStorage.setItem(storageKey, JSON.stringify(views));
		},
		[storageKey],
	);

	const saveCurrentView = useCallback(
		(name: string) => {
			const entry: SavedApprovalView = {
				id: `view-${Date.now()}`,
				name: name.trim() || "Untitled view",
				tab,
				filters: serializeApprovalFilters(filters),
			};
			persistSavedViews([entry, ...savedViews].slice(0, 12));
		},
		[tab, filters, savedViews, persistSavedViews],
	);

	const applySavedView = useCallback((saved: SavedApprovalView) => {
		setTabState(saved.tab);
		setFilters(deserializeApprovalFilters(saved.filters));
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
	}, []);

	const value = useMemo(
		() => ({
			entity,
			tab,
			setTab,
			filters,
			setFilters,
			clearFilters,
			selectedIds,
			toggleSelected,
			selectAll,
			clearSelection,
			previewItem,
			setPreviewItem,
			savedViews,
			saveCurrentView,
			applySavedView,
			deleteSavedView,
			listAnchorRef,
			scrollToList,
		}),
		[
			entity,
			tab,
			setTab,
			filters,
			clearFilters,
			selectedIds,
			toggleSelected,
			selectAll,
			clearSelection,
			previewItem,
			savedViews,
			saveCurrentView,
			applySavedView,
			deleteSavedView,
			scrollToList,
		],
	);

	return (
		<ApprovalsViewContext.Provider value={value}>
			{children}
		</ApprovalsViewContext.Provider>
	);
}

export function useApprovalsView() {
	const context = useContext(ApprovalsViewContext);
	if (!context) {
		throw new Error(
			"useApprovalsView must be used within ApprovalsViewProvider",
		);
	}
	return context;
}
