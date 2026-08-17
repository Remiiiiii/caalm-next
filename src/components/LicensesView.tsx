"use client";

import Image from "next/image";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import EqualHeightGrid from "@/components/EqualHeightGrid";
import LicenseCard from "@/components/licenses/LicenseCard";
import LicensePreviewSheet from "@/components/licenses/LicensePreviewSheet";
import { PageIndex } from "@/components/ui/page-index";
import {
	deserializeLicenseFilters,
	LICENSE_SAVED_VIEWS_STORAGE_KEY,
	LICENSE_VIEW_STORAGE_KEY,
	type LicenseFilters,
	type LicenseStatusTab,
	type LicenseViewType,
	type SavedLicenseView,
	serializeLicenseFilters,
} from "@/lib/licenses/licensesListUtils";
import type { License } from "@/types/licenses";
import LicensesTableView from "./LicensesTableView";

export type ViewType = LicenseViewType;
export type { LicenseFilters, LicenseStatusTab, SavedLicenseView };

interface LicensesViewContextType {
	view: ViewType;
	handleViewChange: (view: ViewType) => void;
	filters: LicenseFilters;
	setFilters: React.Dispatch<React.SetStateAction<LicenseFilters>>;
	clearFilters: () => void;
	statusTab: LicenseStatusTab;
	setStatusTab: (tab: LicenseStatusTab) => void;
	selectedIds: string[];
	toggleSelected: (id: string) => void;
	selectAll: (ids: string[]) => void;
	clearSelection: () => void;
	previewLicense: License | null;
	setPreviewLicense: (license: License | null) => void;
	savedViews: SavedLicenseView[];
	saveCurrentView: (name: string) => void;
	applySavedView: (view: SavedLicenseView) => void;
	deleteSavedView: (id: string) => void;
	listAnchorRef: React.RefObject<HTMLDivElement | null>;
	scrollToList: () => void;
	lockDepartmentFilter: boolean;
}

interface LicensesViewProviderProps {
	children: ReactNode;
	initialDepartmentFilter?: string;
	lockDepartmentFilter?: boolean;
}

const LicensesViewContext = createContext<LicensesViewContextType | undefined>(
	undefined,
);

const emptyFilters = (): LicenseFilters => ({});

export function LicensesViewProvider({
	children,
	initialDepartmentFilter,
	lockDepartmentFilter = false,
}: LicensesViewProviderProps) {
	const [view, setView] = useState<ViewType>("table");
	const [filters, setFilters] = useState<LicenseFilters>(() =>
		initialDepartmentFilter
			? { department: initialDepartmentFilter }
			: emptyFilters(),
	);
	const [statusTab, setStatusTabState] = useState<LicenseStatusTab>("all");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [previewLicense, setPreviewLicense] = useState<License | null>(null);
	const [savedViews, setSavedViews] = useState<SavedLicenseView[]>([]);
	const listAnchorRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const savedView = localStorage.getItem(
			LICENSE_VIEW_STORAGE_KEY,
		) as ViewType | null;
		if (savedView === "table" || savedView === "card") {
			setView(savedView);
		} else {
			setView("table");
			localStorage.setItem(LICENSE_VIEW_STORAGE_KEY, "table");
		}
		try {
			const raw = localStorage.getItem(LICENSE_SAVED_VIEWS_STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as SavedLicenseView[];
				if (Array.isArray(parsed)) setSavedViews(parsed);
			}
		} catch {
			/* ignore */
		}
	}, []);

	const handleViewChange = useCallback((newView: ViewType) => {
		setView(newView);
		localStorage.setItem(LICENSE_VIEW_STORAGE_KEY, newView);
	}, []);

	const setStatusTab = useCallback((tab: LicenseStatusTab) => {
		setStatusTabState(tab);
		setSelectedIds([]);
	}, []);

	const clearFilters = useCallback(() => {
		setFilters(
			lockDepartmentFilter && initialDepartmentFilter
				? { department: initialDepartmentFilter }
				: emptyFilters(),
		);
		setStatusTabState("all");
		setSelectedIds([]);
	}, [lockDepartmentFilter, initialDepartmentFilter]);

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

	const persistSavedViews = useCallback((views: SavedLicenseView[]) => {
		setSavedViews(views);
		localStorage.setItem(
			LICENSE_SAVED_VIEWS_STORAGE_KEY,
			JSON.stringify(views),
		);
	}, []);

	const saveCurrentView = useCallback(
		(name: string) => {
			const entry: SavedLicenseView = {
				id: `view-${Date.now()}`,
				name: name.trim() || "Untitled view",
				statusTab,
				filters: serializeLicenseFilters(filters),
				view,
			};
			persistSavedViews([entry, ...savedViews].slice(0, 12));
		},
		[statusTab, filters, view, savedViews, persistSavedViews],
	);

	const applySavedView = useCallback((saved: SavedLicenseView) => {
		setStatusTabState(saved.statusTab);
		setFilters(deserializeLicenseFilters(saved.filters));
		setView(saved.view);
		localStorage.setItem(LICENSE_VIEW_STORAGE_KEY, saved.view);
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
			previewLicense,
			setPreviewLicense,
			savedViews,
			saveCurrentView,
			applySavedView,
			deleteSavedView,
			listAnchorRef,
			scrollToList,
			lockDepartmentFilter,
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
			previewLicense,
			savedViews,
			saveCurrentView,
			applySavedView,
			deleteSavedView,
			scrollToList,
			lockDepartmentFilter,
		],
	);

	return (
		<LicensesViewContext.Provider value={value}>
			{children}
		</LicensesViewContext.Provider>
	);
}

export function useLicensesView() {
	const context = useContext(LicensesViewContext);
	if (context === undefined) {
		throw new Error(
			"useLicensesView must be used within a LicensesViewProvider",
		);
	}
	return context;
}

export function useLicensesFilter() {
	const context = useLicensesView();
	return {
		filters: context.filters,
		setFilters: context.setFilters,
		clearFilters: context.clearFilters,
	};
}

interface LicensesViewProps {
	licenses: License[];
	user: {
		role?: string;
	} | null;
	onRefresh?: () => void;
	onLicenseRemoved?: (licenseId: string) => void;
}

export default function LicensesView({
	licenses,
	user,
	onRefresh,
	onLicenseRemoved,
}: LicensesViewProps) {
	const { view, previewLicense, setPreviewLicense } = useLicensesView();
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 12;

	const licensesKey = useMemo(
		() => licenses.map((l) => l.$id).join("|"),
		[licenses],
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [licensesKey]);

	const totalPages = Math.max(1, Math.ceil(licenses.length / itemsPerPage));

	const validCurrentPage = useMemo(() => {
		return Math.min(Math.max(1, currentPage), totalPages);
	}, [currentPage, totalPages]);

	useEffect(() => {
		if (totalPages > 0 && (currentPage > totalPages || currentPage < 1)) {
			setCurrentPage(Math.min(Math.max(1, currentPage), totalPages));
		}
	}, [totalPages, currentPage]);

	const startIndex = (validCurrentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedLicenses = useMemo(
		() => licenses.slice(startIndex, endIndex),
		[licenses, startIndex, endIndex],
	);

	if (licenses.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center text-center py-12 px-4">
				<Image
					src="/assets/icons/no-data.svg"
					alt="No licenses found"
					width={250}
					height={250}
					className="mx-auto mb-4 opacity-60"
				/>
				<p className="body-1 text-slate-700">No licenses found</p>
			</div>
		);
	}

	return (
		<>
			{view === "table" ? (
				<>
					<LicensesTableView
						licenses={paginatedLicenses}
						user={user}
						onRefresh={onRefresh}
						onLicenseRemoved={onLicenseRemoved}
					/>
					<PageIndex
						className="mt-6 justify-center"
						page={validCurrentPage}
						totalItems={licenses.length}
						pageSize={itemsPerPage}
						onPageChange={setCurrentPage}
						hideWhenSinglePage
						scrollToTop
						aria-label="Licenses pagination"
					/>
				</>
			) : (
				<>
					<EqualHeightGrid className="grid w-full min-w-0 grid-cols-1 gap-6 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
						{paginatedLicenses.map((license: License) => (
							<div key={license.$id} className="min-w-0 h-full">
								<LicenseCard
									license={license}
									onClick={() => setPreviewLicense(license)}
									onRefresh={onRefresh}
									onLicenseRemoved={onLicenseRemoved}
								/>
							</div>
						))}
					</EqualHeightGrid>
					<PageIndex
						className="mt-6 justify-center"
						page={validCurrentPage}
						totalItems={licenses.length}
						pageSize={itemsPerPage}
						onPageChange={setCurrentPage}
						hideWhenSinglePage
						scrollToTop
						aria-label="Licenses pagination"
					/>
				</>
			)}
			<LicensePreviewSheet
				license={previewLicense}
				open={Boolean(previewLicense)}
				onOpenChange={(open) => {
					if (!open) setPreviewLicense(null);
				}}
				onUpdated={onRefresh}
			/>
		</>
	);
}
