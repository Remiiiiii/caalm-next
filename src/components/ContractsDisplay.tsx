"use client";

import {
	AlertCircle,
	ArrowDown,
	ArrowDownAZ,
	ArrowUp,
	ArrowUpDown,
	ArrowUpZA,
	Calendar,
	ChevronDown,
	Download,
	Loader2,
	ExternalLink,
	Eye,
	FileText,
	RefreshCw,
	Save,
	Search,
	X,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useMemo, useState } from "react";
import ContractDocumentViewer from "@/components/ContractDocumentViewer";
import ContractsSavedSearches from "@/components/ContractsSavedSearches";
import {
	FilesViewToggle,
	type FilesViewType,
} from "@/components/FilesViewToggle";
import { LoadError } from "@/components/LoadError";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
	SortableDataTableHead,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownScrollArea } from "@/components/ui/DropdownScrollArea";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILTER_PILL_TRIGGER } from "@/components/ui/filter-pill";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageIndex } from "@/components/ui/page-index";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ContractCardSkeleton } from "@/components/ui/skeletons";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useGroupedNavigation } from "@/hooks/useGroupedNavigation";
import {
	type UseSAMOpportunitiesFilters,
	useSAMOpportunities,
} from "@/hooks/useSAMOpportunities";
import {
	formatContractAmount,
	formatContractDate,
	getContractTypeDisplay,
	getSetAsideDisplay,
	NOTICE_TYPES,
	RESPONSE_DEADLINE_OPTIONS,
	type SAMContract,
	SET_ASIDE_CODES,
} from "@/lib/sam-config";
import {
	filterSamKeywords,
	filterSamOrganizations,
	getUsStateLabel,
	US_STATES,
} from "@/lib/sam-search-options";
import { downloadXlsx } from "@/lib/export/download-xlsx";
import { cn } from "@/lib/utils";

const FIELD_LABEL_CLASS =
	"text-xs font-semibold uppercase tracking-wider text-slate-600";
const FIELD_INPUT_CLASS =
	"h-10 border-[0.25px] border-slate-300 text-slate-700 placeholder:text-slate-500 hover:border-blue-300 focus-visible:border-[#078FAB] focus-visible:ring-1 focus-visible:ring-[#078FAB]";
const FIELD_ACTIVE_CLASS = "bg-green/10 border-green/30";

const CAALM_BADGE_BASE =
	"inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border";

const SAM_SORT_FIELDS = [
	{ key: "title", label: "Title", kind: "alpha" },
	{ key: "org", label: "Organization", kind: "alpha" },
	{ key: "posted", label: "Posted", kind: "time" },
	{ key: "due", label: "Due date", kind: "time" },
] as const;

type SamSortKey = (typeof SAM_SORT_FIELDS)[number]["key"];
type SamSortValue = `${SamSortKey}-asc` | `${SamSortKey}-desc`;

function parseSamSort(value: SamSortValue): {
	key: SamSortKey;
	direction: "asc" | "desc";
} {
	const lastDash = value.lastIndexOf("-");
	return {
		key: value.slice(0, lastDash) as SamSortKey,
		direction: value.slice(lastDash + 1) === "asc" ? "asc" : "desc",
	};
}

function badgeToneForType(type?: string): string {
	const t = (type || "").toLowerCase();
	if (t.includes("presolicitation") || t.includes("sources sought")) {
		return "bg-orange/10 text-orange border-orange/20";
	}
	if (t.includes("award") || t.includes("combined")) {
		return "bg-blue/10 text-blue border-blue/20";
	}
	if (t.includes("solicitation")) {
		return "bg-green/10 text-green border-green/20";
	}
	return "bg-slate-100 text-slate-600 border-slate-200";
}

function badgeToneForSetAside(code?: string): string {
	if (!code) return "bg-slate-100 text-slate-600 border-slate-200";
	const c = (code || "").toLowerCase();
	if (c.includes("8a") || c.includes("8(a)"))
		return "bg-[#078fab]/10 text-[#078fab] border-[#078fab]/20";
	if (c.includes("hubzone")) return "bg-green/10 text-green border-green/20";
	if (
		c.includes("sdvosb") ||
		c.includes("wosb") ||
		c.includes("edwosb") ||
		c.includes("vosb")
	)
		return "bg-orange/10 text-orange border-orange/20";
	return "bg-blue/10 text-blue border-blue/20";
}

function dueDateUrgency(deadline?: string): {
	className: string;
	srLabel?: string;
} {
	if (!deadline) return { className: "text-slate-600" };
	const ms = Date.parse(deadline);
	if (!Number.isFinite(ms)) return { className: "text-slate-600" };
	const days = Math.ceil((ms - Date.now()) / 86_400_000);
	if (days < 0)
		return { className: "text-red line-through", srLabel: "Expired" };
	if (days <= 14)
		return { className: "text-[#b45309] font-bold", srLabel: "Urgent" };
	if (days <= 30) return { className: "text-[#b45309]/80" };
	return { className: "text-slate-600" };
}

function exportContractsXlsx(contracts: SAMContract[]) {
	const stamp = new Date().toISOString().slice(0, 10);
	downloadXlsx(`caalm-gov-contracts-${stamp}.xlsx`, {
		sheetName: "Government Contracts",
		title: "Government Contracts — Export",
		subtitle: `CAALM · ${contracts.length} opportunit${contracts.length === 1 ? "y" : "ies"} · Generated ${stamp}`,
		columns: [
			{ header: "Notice ID", width: 20 },
			{ header: "Title", width: 40 },
			{ header: "Agency", width: 30 },
			{ header: "Posted", type: "date" as const, width: 14 },
			{ header: "Due Date", type: "date" as const, width: 14 },
			{ header: "NAICS", width: 10 },
			{ header: "Set-Aside", width: 24 },
			{ header: "Estimated Value", type: "currency" as const, width: 18 },
			{ header: "SAM.gov URL", width: 36 },
		],
		rows: contracts.map((c) => [
			c.noticeId || c.solicitationNumber || "",
			c.title || "",
			c.fullParentPathName || c.department || "",
			c.postedDate || null,
			c.responseDeadLine || null,
			c.naicsCode || "",
			c.typeOfSetAsideDescription || "",
			c.award?.amount ? Number(c.award.amount) : null,
			c.uiLink || "",
		]),
	});
}

function getPlaceLabel(contract: SAMContract): string | null {
	const city = contract.placeOfPerformance?.city?.name;
	const state =
		contract.placeOfPerformance?.state?.name ||
		contract.placeOfPerformance?.state?.code;
	const label = [city, state].filter(Boolean).join(", ");
	return label || null;
}

function parseSamDate(value?: string): number {
	if (!value) return 0;
	const t = Date.parse(value);
	return Number.isFinite(t) ? t : 0;
}

function sortSamContracts(
	list: SAMContract[],
	sort: SamSortValue,
): SAMContract[] {
	const { key, direction } = parseSamSort(sort);
	const dir = direction === "asc" ? 1 : -1;
	const next = [...list];
	next.sort((a, b) => {
		switch (key) {
			case "due":
				return (
					dir *
					(parseSamDate(a.responseDeadLine) - parseSamDate(b.responseDeadLine))
				);
			case "posted":
				return dir * (parseSamDate(a.postedDate) - parseSamDate(b.postedDate));
			case "title":
				return dir * (a.title || "").localeCompare(b.title || "");
			case "org":
				return (
					dir *
					(a.fullParentPathName || a.department || "").localeCompare(
						b.fullParentPathName || b.department || "",
					)
				);
			default:
				return 0;
		}
	});
	return next;
}

async function saveAsPursuit(contract: SAMContract) {
	const amount = Number(
		contract.award?.amount ||
			(contract as { awardAmount?: number }).awardAmount ||
			0,
	);
	const res = await fetch("/api/funding/pursuits", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			title: contract.title,
			amount: Number.isFinite(amount) ? amount : 0,
			source: "sam_gov",
			stage: "watching",
			samNoticeId: contract.noticeId,
			samUrl: contract.uiLink,
			responseDeadline: contract.responseDeadLine,
			description: contract.naicsDescription || undefined,
		}),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.error || "Could not save pursuit");
	}
	window.location.href = "/contracts/funding-retention?tab=pursuits";
}

type SearchFilterChipKey =
	| "keyword"
	| "procurementType"
	| "setAsideType"
	| "state"
	| "organizationName"
	| "responseDeadlineOption";

function getActiveSearchFilterChips(
	filters: UseSAMOpportunitiesFilters,
): { key: SearchFilterChipKey; label: string; value: string }[] {
	const chips: { key: SearchFilterChipKey; label: string; value: string }[] =
		[];

	if (filters.keyword?.trim()) {
		chips.push({
			key: "keyword",
			label: "Keyword",
			value: filters.keyword.trim(),
		});
	}
	if (filters.procurementType) {
		chips.push({
			key: "procurementType",
			label: "Procurement Type",
			value:
				NOTICE_TYPES[filters.procurementType as keyof typeof NOTICE_TYPES] ??
				filters.procurementType,
		});
	}
	if (filters.setAsideType) {
		chips.push({
			key: "setAsideType",
			label: "Set-Aside Type",
			value: getSetAsideDisplay(filters.setAsideType),
		});
	}
	if (filters.state?.trim()) {
		chips.push({
			key: "state",
			label: "State",
			value: getUsStateLabel(filters.state.trim()),
		});
	}
	if (filters.organizationName?.trim()) {
		chips.push({
			key: "organizationName",
			label: "Organization",
			value: filters.organizationName.trim(),
		});
	}
	if (
		filters.responseDeadlineOption &&
		filters.responseDeadlineOption !== "Anytime"
	) {
		chips.push({
			key: "responseDeadlineOption",
			label: "Response Due",
			value: filters.responseDeadlineOption,
		});
	}

	return chips;
}

interface ContractCardProps {
	contract: SAMContract;
	onViewDocument?: (contract: SAMContract) => void;
}

const ContractCard = React.memo(
	({ contract, onViewDocument }: ContractCardProps) => {
		const placeLabel = getPlaceLabel(contract);
		const typeLabel = getContractTypeDisplay(contract.type);
		const setAsideLabel = contract.typeOfSetAside
			? getSetAsideDisplay(contract.typeOfSetAside)
			: contract.typeOfSetAsideDescription;

		const handleViewDetails = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation();
				onViewDocument?.(contract);
			},
			[contract, onViewDocument],
		);

		const handleSavePursuit = useCallback(
			async (e: React.MouseEvent) => {
				e.stopPropagation();
				try {
					await saveAsPursuit(contract);
				} catch (err) {
					console.error("[ContractsDisplay] save pursuit", err);
					window.alert(
						err instanceof Error ? err.message : "Could not save as pursuit",
					);
				}
			},
			[contract],
		);

		return (
			<Card className="glass-card interactive-glass-card h-full flex flex-col min-w-0">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
					{/* Badge + due date */}
					<div className="flex items-start justify-between gap-2">
						<div className="flex flex-wrap gap-1.5 min-w-0">
							{setAsideLabel ? (
								<span
									className={cn(
										CAALM_BADGE_BASE,
										badgeToneForSetAside(contract.typeOfSetAside),
									)}
								>
									<span
										className="size-1.5 rounded-full bg-current opacity-80"
										aria-hidden
									/>
									<span className="truncate max-w-44">{setAsideLabel}</span>
								</span>
							) : (
								<span
									className={cn(
										CAALM_BADGE_BASE,
										badgeToneForType(contract.type),
									)}
								>
									<span
										className="size-1.5 rounded-full bg-current opacity-80"
										aria-hidden
									/>
									<span className="truncate max-w-44">{typeLabel}</span>
								</span>
							)}
						</div>
						{contract.responseDeadLine &&
							(() => {
								const urgency = dueDateUrgency(contract.responseDeadLine);
								return (
									<p className={cn("shrink-0 text-xs", urgency.className)}>
										{urgency.srLabel && (
											<span className="sr-only">{urgency.srLabel}</span>
										)}
										Due{" "}
										<span
											className={
												urgency.className.includes("font-bold")
													? ""
													: "font-semibold"
											}
										>
											{formatContractDate(contract.responseDeadLine)}
										</span>
									</p>
								);
							})()}
					</div>

					{/* Title */}
					<div className="min-w-0">
						<h3
							className="text-sm font-bold text-[#0f5384] leading-snug line-clamp-2"
							title={contract.title || ""}
						>
							{contract.title}
						</h3>
					</div>

					{/* Meta rows */}
					<div className="space-y-1 text-xs text-[#64748b]">
						{contract.solicitationNumber && (
							<p className="inline-flex items-center gap-1.5">
								<FileText
									className="h-3.5 w-3.5 shrink-0 text-slate-500"
									aria-hidden
								/>
								Notice ID: {contract.solicitationNumber}
							</p>
						)}
						<p className="inline-flex items-center gap-1.5">
							<Calendar
								className="h-3.5 w-3.5 shrink-0 text-slate-500"
								aria-hidden
							/>
							Posted {formatContractDate(contract.postedDate)}
						</p>
					</div>

					{/* Actions — divider above; View | SAM.gov left, Save right */}
					<div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200/60 pt-3">
						<div className="flex items-center gap-0 min-w-0">
							<button
								type="button"
								onClick={handleViewDetails}
								className="inline-flex items-center gap-1.5 text-xs font-medium text-[#078fab] hover:text-[#0f5384] transition-colors cursor-pointer"
							>
								View details
							</button>
							{contract.uiLink && (
								<>
									<span className="mx-2 text-slate-300" aria-hidden>
										|
									</span>
									<a
										href={contract.uiLink}
										target="_blank"
										rel="noopener noreferrer"
										onClick={(e) => e.stopPropagation()}
										className="inline-flex items-center gap-1 text-xs font-medium text-[#078fab] hover:text-[#0f5384] transition-colors"
									>
										SAM.gov
										<ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
									</a>
								</>
							)}
						</div>
						<Button
							size="sm"
							className="btn-primary px-3 shrink-0 gap-1.5"
							onClick={handleSavePursuit}
						>
							<Save className="h-3.5 w-3.5" aria-hidden />
							Save as pursuit
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	},
);

ContractCard.displayName = "ContractCard";

const samRowPad = "px-3 py-3 align-middle";

function SamContractsTable({
	contracts,
	onViewDocument,
	sort,
	onSortChange,
}: {
	contracts: SAMContract[];
	onViewDocument: (contract: SAMContract) => void;
	sort: SamSortValue;
	onSortChange: (value: SamSortValue) => void;
}) {
	const { key: sortKey, direction: sortDirection } = parseSamSort(sort);

	const toggleSort = (field: SamSortKey) => {
		onSortChange(
			`${field}-${sortKey === field && sortDirection === "asc" ? "desc" : "asc"}` as SamSortValue,
		);
	};

	return (
		<CaalmDataTable className="pb-0">
			<TableHeader className="[&_tr]:border-b-0">
				<TableRow className={DATA_TABLE_HEADER_ROW}>
					<SortableDataTableHead
						label="Title"
						active={sortKey === "title"}
						onClick={() => toggleSort("title")}
						className="pl-4 pr-3"
					/>
					<SortableDataTableHead
						label="Organization"
						active={sortKey === "org"}
						onClick={() => toggleSort("org")}
						className="hidden sm:table-cell"
					/>
					<TableHead
						className={cn(DATA_TABLE_HEADER_CELL, "px-3 hidden md:table-cell")}
					>
						Procurement Type
					</TableHead>
					<TableHead
						className={cn(DATA_TABLE_HEADER_CELL, "px-3 hidden lg:table-cell")}
					>
						Set-Aside
					</TableHead>
					<TableHead
						className={cn(DATA_TABLE_HEADER_CELL, "px-3 hidden lg:table-cell")}
					>
						State
					</TableHead>
					<SortableDataTableHead
						label="Posted"
						active={sortKey === "posted"}
						onClick={() => toggleSort("posted")}
						className="hidden xl:table-cell"
					/>
					<SortableDataTableHead
						label="Due"
						active={sortKey === "due"}
						onClick={() => toggleSort("due")}
					/>
					<TableHead
						className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4 text-right")}
					>
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody className="[&_tr:last-child>td]:border-b-0">
				{contracts.map((contract, index) => {
					const organization =
						contract.fullParentPathName || contract.department;
					const procurementType = getContractTypeDisplay(contract.type);
					const setAsideLabel = contract.typeOfSetAside
						? getSetAsideDisplay(contract.typeOfSetAside)
						: contract.typeOfSetAsideDescription;
					const stateLabel =
						contract.placeOfPerformance?.state?.code ||
						contract.placeOfPerformance?.state?.name ||
						contract.officeAddress?.state;
					return (
						<TableRow
							key={
								contract.noticeId ||
								contract.solicitationNumber ||
								`${contract.title?.slice(0, 20)}-${index}`
							}
							className={DATA_TABLE_BODY_ROW_BASE}
						>
							<TableCell className={cn(samRowPad, "pl-4 pr-3 min-w-0")}>
								<p className="font-medium text-slate-700 line-clamp-2">
									{contract.title}
								</p>
								{contract.solicitationNumber && (
									<p className="text-xs text-slate-500 mt-0.5">
										{contract.solicitationNumber}
									</p>
								)}
							</TableCell>
							<TableCell
								className={cn(
									samRowPad,
									"text-slate-700 hidden sm:table-cell max-w-56 truncate",
								)}
							>
								{organization || "—"}
							</TableCell>
							<TableCell className={cn(samRowPad, "hidden md:table-cell")}>
								{procurementType ? (
									<span
										className={cn(
											CAALM_BADGE_BASE,
											badgeToneForType(contract.type),
										)}
									>
										<span
											className="size-1.5 rounded-full bg-current opacity-80"
											aria-hidden
										/>
										<span className="truncate max-w-32">{procurementType}</span>
									</span>
								) : (
									<span className="text-slate-700">—</span>
								)}
							</TableCell>
							<TableCell
								className={cn(samRowPad, "text-slate-700 hidden lg:table-cell")}
							>
								{setAsideLabel || "—"}
							</TableCell>
							<TableCell
								className={cn(samRowPad, "text-slate-700 hidden lg:table-cell")}
							>
								{stateLabel || "—"}
							</TableCell>
							<TableCell
								className={cn(samRowPad, "text-slate-700 hidden xl:table-cell")}
							>
								{formatContractDate(contract.postedDate)}
							</TableCell>
							<TableCell className={cn(samRowPad, "text-slate-700")}>
								{contract.responseDeadLine
									? formatContractDate(contract.responseDeadLine)
									: "—"}
							</TableCell>
							<TableCell className={cn(samRowPad, "pl-3 pr-4")}>
								<div className="flex items-center justify-end">
									<DropdownMenu>
										<DropdownMenuTrigger
											className="shad-no-focus rounded-full transition-colors hover:bg-white/30 cursor-pointer"
											aria-label={`Actions for ${contract.title || "contract"}`}
										>
											<Image
												src="/assets/icons/dots.svg"
												alt=""
												width={34}
												height={34}
											/>
										</DropdownMenuTrigger>
										<AppDropdownMenuContent align="end">
											<AppDropdownMenuItem
												icon={Eye}
												onClick={() => onViewDocument(contract)}
											>
												View
											</AppDropdownMenuItem>
											<AppDropdownMenuItem
												icon={Save}
												onClick={async () => {
													try {
														await saveAsPursuit(contract);
													} catch (err) {
														console.error(
															"[ContractsDisplay] save pursuit",
															err,
														);
														window.alert(
															err instanceof Error
																? err.message
																: "Could not save as pursuit",
														);
													}
												}}
											>
												Save
											</AppDropdownMenuItem>
										</AppDropdownMenuContent>
									</DropdownMenu>
								</div>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</CaalmDataTable>
	);
}

export default function ContractsDisplay() {
	const { isITUser } = useGroupedNavigation();
	// Enhanced search parameters with new SAM.gov API features
	const [searchFilters, setSearchFilters] =
		useState<UseSAMOpportunitiesFilters>({
			keyword: "",
			procurementType: "",
			setAsideType: "",
			state: "",
			organizationName: "",
			responseDeadlineOption: "Anytime",
			limit: 12,
			offset: 0,
		});

	// Document Viewer State
	const [selectedContract, setSelectedContract] = useState<SAMContract | null>(
		null,
	);
	const [showDocumentViewer, setShowDocumentViewer] = useState(false);
	const [resultsView, setResultsView] = useState<FilesViewType>("card");
	const [resultsSort, setResultsSort] = useState<SamSortValue>("due-desc");
	const [orgSuggestionsOpen, setOrgSuggestionsOpen] = useState(false);
	const [keywordSuggestionsOpen, setKeywordSuggestionsOpen] = useState(false);
	const [exportingXlsx, setExportingXlsx] = useState(false);

	// Use the new SAM opportunities hook with SWR caching
	const {
		opportunities: contracts,
		loading,
		error,
		totalRecords,
		searchOpportunities,
		clearResults,
		hasSearched,
	} = useSAMOpportunities();

	const buildCleanFilters = useCallback(
		(filters: UseSAMOpportunitiesFilters): UseSAMOpportunitiesFilters => {
			const cleaned = Object.fromEntries(
				Object.entries(filters).filter(([key, value]) => {
					if (typeof value === "string") {
						return value !== "" && value !== "all";
					}
					if (typeof value === "number") {
						// Always keep pagination fields (offset can be 0 on page 1)
						return key === "limit" || key === "offset" || value > 0;
					}
					return value !== null && value !== undefined;
				}),
			) as UseSAMOpportunitiesFilters;

			// Force offset onto the payload so page 2+ never drops it
			cleaned.limit = filters.limit || 12;
			cleaned.offset = filters.offset || 0;
			return cleaned;
		},
		[],
	);

	const handleSearch = useCallback(async () => {
		const nextFilters = { ...searchFilters, offset: 0 };
		setSearchFilters(nextFilters);
		try {
			await searchOpportunities(buildCleanFilters(nextFilters));
		} catch (err) {
			console.error("[CLIENT] ContractsDisplay: SAM search failed", err);
		}
	}, [searchFilters, searchOpportunities, buildCleanFilters]);

	const handleReset = useCallback(() => {
		setSearchFilters({
			keyword: "",
			procurementType: "",
			setAsideType: "",
			state: "",
			organizationName: "",
			responseDeadlineOption: "Anytime",
			limit: 12,
			offset: 0,
		});
		clearResults();
	}, [clearResults]);

	const clearSearchFilter = useCallback((key: SearchFilterChipKey) => {
		setSearchFilters((prev) => ({
			...prev,
			[key]: key === "responseDeadlineOption" ? "Anytime" : "",
		}));
	}, []);

	const activeFilterChips = getActiveSearchFilterChips(searchFilters);

	const handlePageChange = useCallback(
		async (nextPage: number) => {
			// SAM.gov `offset` is a 0-based *page index*, not (page-1)*limit
			const nextFilters = {
				...searchFilters,
				offset: Math.max(0, nextPage - 1),
			};
			setSearchFilters(nextFilters);
			try {
				await searchOpportunities(buildCleanFilters(nextFilters));
			} catch (err) {
				console.error("[CLIENT] ContractsDisplay: SAM page change failed", err);
			}
		},
		[searchFilters, searchOpportunities, buildCleanFilters],
	);

	// Document Viewer Handlers
	const handleViewDocument = useCallback((contract: SAMContract) => {
		setSelectedContract(contract);
		setShowDocumentViewer(true);
	}, []);

	const handleCloseDocumentViewer = useCallback(() => {
		setShowDocumentViewer(false);
		setSelectedContract(null);
	}, []);

	const sortedContracts = useMemo(
		() => sortSamContracts(contracts, resultsSort),
		[contracts, resultsSort],
	);

	const { key: sortKey, direction: sortDirection } = parseSamSort(resultsSort);

	const organizationSuggestions = useMemo(
		() => filterSamOrganizations(searchFilters.organizationName || "", 8),
		[searchFilters.organizationName],
	);

	const keywordSuggestions = useMemo(
		() => filterSamKeywords(searchFilters.keyword || "", 8),
		[searchFilters.keyword],
	);

	return (
		<div className="space-y-6 transition-all duration-300 ease-in-out">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold sidebar-gradient-text">
						Government Contracts
					</h1>
					<p className="text-slate-600 mt-1">
						Search and explore active opportunities from SAM.gov across all
						federal agencies.
					</p>
				</div>
			</div>

			{/* Search Form */}
			<div className="scroll-mt-4">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardHeader className="pb-3 pt-6 px-4 sm:px-6">
						<div className="flex items-center justify-between gap-3">
							<CardTitle className="flex items-center gap-2 text-xl font-semibold sidebar-gradient-text">
								<Search className="h-5 w-5 text-[#0f5384]" />
								Search contracts
							</CardTitle>
							{activeFilterChips.length > 0 && (
								<span className="inline-block shrink-0 px-2 py-0.5 text-xs rounded-full border bg-green/10 text-green border-green/20">
									{activeFilterChips.length} filter
									{activeFilterChips.length === 1 ? "" : "s"} active
								</span>
							)}
						</div>
					</CardHeader>
					<CardContent className="space-y-4 px-4 sm:px-6 pb-6">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div className="space-y-1.5 relative">
								<Label htmlFor="keyword" className={FIELD_LABEL_CLASS}>
									Keyword
								</Label>
								<Input
									id="keyword"
									placeholder="Enter search terms"
									value={searchFilters.keyword}
									autoComplete="off"
									aria-autocomplete="list"
									aria-expanded={keywordSuggestionsOpen}
									className={cn(
										FIELD_INPUT_CLASS,
										searchFilters.keyword?.trim() && FIELD_ACTIVE_CLASS,
									)}
									onChange={(e) => {
										setSearchFilters((prev) => ({
											...prev,
											keyword: e.target.value,
										}));
										setKeywordSuggestionsOpen(true);
									}}
									onFocus={() => setKeywordSuggestionsOpen(true)}
									onBlur={() => {
										window.setTimeout(
											() => setKeywordSuggestionsOpen(false),
											150,
										);
									}}
									onKeyDown={(e) => {
										if (e.key === "Escape") {
											setKeywordSuggestionsOpen(false);
											return;
										}
										if (e.key === "Enter") {
											setKeywordSuggestionsOpen(false);
											handleSearch();
										}
									}}
								/>
								{keywordSuggestionsOpen &&
									keywordSuggestions.length > 0 &&
									(searchFilters.keyword?.trim().length ?? 0) > 0 && (
										<div className="absolute z-50 top-full left-0 right-0 mt-1 overflow-hidden rounded-md border border-white/30 bg-white/10 shadow-md backdrop-blur">
											<DropdownScrollArea maxHeightClassName="max-h-60">
												{keywordSuggestions.map((term) => (
													<button
														key={term}
														type="button"
														className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-white/30 cursor-pointer transition-colors border-b border-white/10 last:border-b-0"
														onMouseDown={(e) => e.preventDefault()}
														onClick={() => {
															setSearchFilters((prev) => ({
																...prev,
																keyword: term,
															}));
															setKeywordSuggestionsOpen(false);
														}}
													>
														{term}
													</button>
												))}
											</DropdownScrollArea>
										</div>
									)}
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="procurementType" className={FIELD_LABEL_CLASS}>
									Procurement Type
								</Label>
								<Select
									value={searchFilters.procurementType || "all"}
									onValueChange={(value) =>
										setSearchFilters((prev) => ({
											...prev,
											procurementType: value === "all" ? "" : value,
										}))
									}
								>
									<SelectTrigger
										id="procurementType"
										className={cn(
											FIELD_INPUT_CLASS,
											searchFilters.procurementType && FIELD_ACTIVE_CLASS,
										)}
									>
										<SelectValue placeholder="All Types" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Types</SelectItem>
										{Object.entries(NOTICE_TYPES).map(([code, name]) => (
											<SelectItem key={code} value={code}>
												{name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="setAside" className={FIELD_LABEL_CLASS}>
									Set-Aside Type
								</Label>
								<Select
									value={searchFilters.setAsideType || "all"}
									onValueChange={(value) =>
										setSearchFilters((prev) => ({
											...prev,
											setAsideType: value === "all" ? "" : value,
										}))
									}
								>
									<SelectTrigger
										id="setAside"
										className={cn(
											FIELD_INPUT_CLASS,
											searchFilters.setAsideType && FIELD_ACTIVE_CLASS,
										)}
									>
										<SelectValue placeholder="All Set-Asides" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Set-Asides</SelectItem>
										{Object.entries(SET_ASIDE_CODES).map(([code, name]) => (
											<SelectItem key={code} value={code}>
												{name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="state" className={FIELD_LABEL_CLASS}>
									State
								</Label>
								<Select
									value={searchFilters.state || "all"}
									onValueChange={(value) =>
										setSearchFilters((prev) => ({
											...prev,
											state: value === "all" ? "" : value,
										}))
									}
								>
									<SelectTrigger
										id="state"
										className={cn(
											FIELD_INPUT_CLASS,
											searchFilters.state && FIELD_ACTIVE_CLASS,
										)}
									>
										<SelectValue placeholder="All states" />
									</SelectTrigger>
									<SelectContent className="max-h-72">
										<SelectItem value="all">All states</SelectItem>
										{US_STATES.map((state) => (
											<SelectItem key={state.code} value={state.code}>
												{state.code} — {state.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5 relative">
								<Label htmlFor="organization" className={FIELD_LABEL_CLASS}>
									Organization
								</Label>
								<Input
									id="organization"
									placeholder="e.g., GSA, Defense, Agriculture"
									value={searchFilters.organizationName}
									autoComplete="off"
									aria-autocomplete="list"
									aria-expanded={orgSuggestionsOpen}
									className={cn(
										FIELD_INPUT_CLASS,
										searchFilters.organizationName?.trim() &&
											FIELD_ACTIVE_CLASS,
									)}
									onChange={(e) => {
										setSearchFilters((prev) => ({
											...prev,
											organizationName: e.target.value,
										}));
										setOrgSuggestionsOpen(true);
									}}
									onFocus={() => setOrgSuggestionsOpen(true)}
									onBlur={() => {
										// Delay so a suggestion click registers before close
										window.setTimeout(() => setOrgSuggestionsOpen(false), 150);
									}}
									onKeyDown={(e) => {
										if (e.key === "Escape") setOrgSuggestionsOpen(false);
									}}
								/>
								{orgSuggestionsOpen &&
									organizationSuggestions.length > 0 &&
									(searchFilters.organizationName?.trim().length ?? 0) > 0 && (
										<div className="absolute z-50 top-full left-0 right-0 mt-1 overflow-hidden rounded-md border border-white/30 bg-white/10 shadow-md backdrop-blur">
											<DropdownScrollArea maxHeightClassName="max-h-60">
												{organizationSuggestions.map((org) => (
													<button
														key={org.name}
														type="button"
														className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-white/30 cursor-pointer transition-colors border-b border-white/10 last:border-b-0"
														onMouseDown={(e) => e.preventDefault()}
														onClick={() => {
															setSearchFilters((prev) => ({
																...prev,
																organizationName: org.name,
															}));
															setOrgSuggestionsOpen(false);
														}}
													>
														<span className="font-medium">{org.name}</span>
														{org.aliases[0] ? (
															<span className="ml-2 text-xs text-slate-500">
																{org.aliases[0].toUpperCase()}
															</span>
														) : null}
													</button>
												))}
											</DropdownScrollArea>
										</div>
									)}
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="responseDeadline" className={FIELD_LABEL_CLASS}>
									Response Due
								</Label>
								<Select
									value={searchFilters.responseDeadlineOption}
									onValueChange={(value) =>
										setSearchFilters((prev) => ({
											...prev,
											responseDeadlineOption:
												value as keyof typeof RESPONSE_DEADLINE_OPTIONS,
										}))
									}
								>
									<SelectTrigger
										id="responseDeadline"
										className={cn(
											FIELD_INPUT_CLASS,
											searchFilters.responseDeadlineOption &&
												searchFilters.responseDeadlineOption !== "Anytime" &&
												FIELD_ACTIVE_CLASS,
										)}
									>
										<SelectValue placeholder="Anytime" />
									</SelectTrigger>
									<SelectContent>
										{Object.keys(RESPONSE_DEADLINE_OPTIONS).map((option) => (
											<SelectItem key={option} value={option}>
												{option}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{activeFilterChips.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{activeFilterChips.map((chip) => (
									<button
										key={chip.key}
										type="button"
										onClick={() => clearSearchFilter(chip.key)}
										className="inline-flex items-center gap-1.5 rounded-md border border-green/20 bg-green/10 px-2.5 py-1 text-xs text-green transition-colors hover:bg-green/20 cursor-pointer"
										aria-label={`Remove ${chip.label} filter`}
									>
										<span className="text-slate-700">
											{chip.label}: {chip.value}
										</span>
										<X className="h-3 w-3 shrink-0 text-green" aria-hidden />
									</button>
								))}
							</div>
						)}

						{/* Action Buttons */}
						<div className="flex flex-wrap items-center justify-end gap-3">
							<Button
								type="button"
								onClick={handleReset}
								className="btn-primary gap-2 px-3 sm:px-4"
							>
								<RefreshCw className="h-4 w-4" />
								Reset
							</Button>
							<Button
								type="button"
								onClick={handleSearch}
								disabled={loading}
								className="btn-primary gap-2 px-3 sm:px-4"
							>
								<Search className="h-4 w-4" />
								{loading ? "Searching…" : "Search contracts"}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Enhanced Error Display with Setup Instructions */}
			{error && (
				<LoadError
					scale="section"
					title="We couldn't load contracts"
					description="Please try again in a few moments. If the problem persists, contact support."
					elementKey="contracts-display"
					error={{ requestPath: "/api/sam-opportunities" }}
					onRetry={() => searchOpportunities({})}
				/>
			)}

			{hasSearched && !error && (
				<div className="space-y-4">
					<div className="border-t border-slate-300" aria-hidden />
					{/* Control bar */}
					<div className="flex pt-2 pb-1 gap-3 justify-between flex-wrap items-center">
						<div className="flex items-center gap-3 flex-wrap min-w-0">
							<p
								className="text-sm font-semibold text-[#0f5384]"
								aria-live="polite"
							>
								{totalRecords.toLocaleString()} contracts found
							</p>
							<span className="inline-flex items-center gap-1.5 rounded-full border border-[#a7e9d5] bg-[#edfaf6] px-2.5 py-0.5 text-xs text-green">
								<span className="size-1.5 rounded-full bg-green" aria-hidden />
								Live SAM.gov data
							</span>
						</div>
						<div className="flex items-center gap-2 justify-end flex-wrap">
							{/* View toggle */}
							<FilesViewToggle
								view={resultsView}
								onViewChange={setResultsView}
							/>
							{/* Sort dropdown — field + direction, matching Sort.tsx */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button type="button" className={FILTER_PILL_TRIGGER}>
										<ArrowUpDown className="h-4 w-4 shrink-0 text-slate-600" />
										<span className="hidden sm:inline">Sort by</span>
										<ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
									</button>
								</DropdownMenuTrigger>
								<AppDropdownMenuContent align="end" className="w-72 p-1">
									{SAM_SORT_FIELDS.map((field) => {
										const active = sortKey === field.key;
										const ascLabel =
											field.kind === "alpha" ? "A to Z" : "oldest first";
										const descLabel =
											field.kind === "alpha" ? "Z to A" : "newest first";
										return (
											<div
												key={field.key}
												className={cn(
													"flex items-center justify-between gap-3 rounded-lg px-3 py-2",
													active && "bg-blue-50",
												)}
											>
												<p
													className={cn(
														"text-sm font-medium",
														active ? "text-[#0f5384]" : "text-slate-700",
													)}
												>
													{field.label}
												</p>
												<div className="flex items-center gap-1">
													<button
														type="button"
														aria-label={`${field.label} ${ascLabel}`}
														aria-pressed={active && sortDirection === "asc"}
														onClick={() =>
															setResultsSort(`${field.key}-asc` as SamSortValue)
														}
														className={cn(
															"inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors duration-200",
															"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
															active && sortDirection === "asc"
																? "bg-white text-[#0f5384] shadow-sm"
																: "text-slate-400 hover:text-slate-700",
														)}
													>
														{field.kind === "alpha" ? (
															<ArrowDownAZ className="h-4 w-4" />
														) : (
															<ArrowDown className="h-4 w-4" />
														)}
													</button>
													<button
														type="button"
														aria-label={`${field.label} ${descLabel}`}
														aria-pressed={active && sortDirection === "desc"}
														onClick={() =>
															setResultsSort(
																`${field.key}-desc` as SamSortValue,
															)
														}
														className={cn(
															"inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors duration-200",
															"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
															active && sortDirection === "desc"
																? "bg-white text-[#0f5384] shadow-sm"
																: "text-slate-400 hover:text-slate-700",
														)}
													>
														{field.kind === "alpha" ? (
															<ArrowUpZA className="h-4 w-4" />
														) : (
															<ArrowUp className="h-4 w-4" />
														)}
													</button>
												</div>
											</div>
										);
									})}
								</AppDropdownMenuContent>
							</DropdownMenu>
							{/* Save / Export */}
							{sortedContracts.length > 0 && !loading && (
								<ContractsSavedSearches
									currentFilters={searchFilters}
									onApply={(filters) => {
										const nextFilters = { ...filters, offset: 0 };
										setSearchFilters(nextFilters);
										searchOpportunities(buildCleanFilters(nextFilters)).catch(
											(err) => {
												console.error(
													"[CLIENT] ContractsDisplay: saved search replay failed",
													err,
												);
											},
										);
									}}
								/>
							)}
							<Button
								type="button"
								className="btn-primary gap-1.5 px-2.5 py-1.5 h-8 text-xs"
								disabled={exportingXlsx}
								onClick={async () => {
									setExportingXlsx(true);
									await new Promise((r) => setTimeout(r, 400));
									exportContractsXlsx(sortedContracts);
									setExportingXlsx(false);
								}}
							>
								{exportingXlsx ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Download className="h-3.5 w-3.5" aria-hidden />
								)}
								{exportingXlsx ? "Preparing Excel…" : "Export Excel"}
							</Button>
						</div>
					</div>

					<div
						className={cn(
							"transition-opacity duration-300 ease-in-out",
							loading && sortedContracts.length > 0 && "opacity-60",
						)}
					>
						{loading && sortedContracts.length === 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
								{[1, 2, 3, 4, 5, 6].map((index) => (
									<ContractCardSkeleton key={`loading-${index}`} />
								))}
							</div>
						) : sortedContracts.length > 0 ? (
							<>
								{resultsView === "card" ? (
									<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
										{sortedContracts.map((contract, index) => (
											<ContractCard
												key={
													contract.noticeId ||
													contract.solicitationNumber ||
													`${contract.title?.slice(0, 20)}-${index}`
												}
												contract={contract}
												onViewDocument={handleViewDocument}
											/>
										))}
									</div>
								) : (
									<Card className="glass-card">
										<div className="glass-card-cap" />
										<CardContent className="p-4 sm:p-6">
											<SamContractsTable
												contracts={sortedContracts}
												onViewDocument={handleViewDocument}
												sort={resultsSort}
												onSortChange={setResultsSort}
											/>
										</CardContent>
									</Card>
								)}
								<PageIndex
									className="mt-6 justify-center"
									page={(searchFilters.offset || 0) + 1}
									totalItems={totalRecords}
									pageSize={searchFilters.limit || 12}
									onPageChange={handlePageChange}
									hideWhenSinglePage
									showRange
									itemLabel="contracts"
									disabled={loading}
									aria-label="SAM contracts pagination"
								/>
							</>
						) : totalRecords > 0 ? (
							<Card className="glass-card">
								<div className="glass-card-cap" />
								<CardContent className="p-8 text-center space-y-3">
									<AlertCircle className="h-12 w-12 text-orange mx-auto" />
									<h3 className="text-lg font-medium text-slate-700">
										Couldn&apos;t load this page
									</h3>
									<p className="text-slate-500">
										{totalRecords.toLocaleString()} contracts matched, but this
										page returned no rows. Try Previous/Next again or re-run
										Search.
									</p>
									<Button
										type="button"
										className="btn-primary px-3 sm:px-4"
										disabled={loading}
										onClick={() =>
											handlePageChange((searchFilters.offset || 0) + 1)
										}
									>
										Retry page
									</Button>
								</CardContent>
							</Card>
						) : (
							<Card className="glass-card">
								<div className="glass-card-cap" />
								<CardContent className="p-8 text-center">
									<FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
									<h3 className="text-lg font-medium text-slate-700 mb-2">
										No contracts found
									</h3>
									<p className="text-slate-500">
										Try adjusting your search criteria or keywords
									</p>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			)}

			{/* Contract Document Viewer Modal */}
			<ContractDocumentViewer
				isOpen={showDocumentViewer}
				onClose={handleCloseDocumentViewer}
				contract={selectedContract}
			/>
		</div>
	);
}
