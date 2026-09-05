"use client";

import {
	AlertCircle,
	Building2,
	Calendar,
	DollarSign,
	ExternalLink,
	Eye,
	FileText,
	MapPin,
	RefreshCw,
	Save,
	Search,
	X,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useMemo, useState } from "react";
import ContractDocumentViewer from "@/components/ContractDocumentViewer";
import {
	FilesViewToggle,
	type FilesViewType,
} from "@/components/FilesViewToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";

const FIELD_LABEL_CLASS = "text-sm font-medium text-slate-700";
const FIELD_INPUT_CLASS =
	"h-10 border-[0.25px] border-slate-300 text-slate-700 placeholder:text-slate-500 hover:border-blue-300 focus-visible:border-[#078FAB] focus-visible:ring-1 focus-visible:ring-[#078FAB]";
const FIELD_ACTIVE_CLASS = "bg-green/10 border-green/30";

const CAALM_BADGE_BASE =
	"inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full font-medium border";

const SAM_SORT_OPTIONS = [
	{ value: "due-asc", label: "Due date ↑" },
	{ value: "due-desc", label: "Due date ↓" },
	{ value: "posted-desc", label: "Posted (newest)" },
	{ value: "posted-asc", label: "Posted (oldest)" },
	{ value: "title-asc", label: "Title A–Z" },
] as const;

type SamSortValue = (typeof SAM_SORT_OPTIONS)[number]["value"];

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
	return "bg-blue/10 text-blue border-blue/20";
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
	const next = [...list];
	next.sort((a, b) => {
		switch (sort) {
			case "due-asc":
				return (
					parseSamDate(a.responseDeadLine) - parseSamDate(b.responseDeadLine)
				);
			case "due-desc":
				return (
					parseSamDate(b.responseDeadLine) - parseSamDate(a.responseDeadLine)
				);
			case "posted-asc":
				return parseSamDate(a.postedDate) - parseSamDate(b.postedDate);
			case "posted-desc":
				return parseSamDate(b.postedDate) - parseSamDate(a.postedDate);
			case "title-asc":
				return (a.title || "").localeCompare(b.title || "");
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
	window.location.href = "/contracts/funding-retention";
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
						{contract.responseDeadLine && (
							<p className="shrink-0 text-xs text-slate-700">
								Due{" "}
								<span className="font-semibold">
									{formatContractDate(contract.responseDeadLine)}
								</span>
							</p>
						)}
					</div>

					{/* Title + notice ID */}
					<div className="min-w-0 space-y-1">
						<h3 className="text-base font-semibold sidebar-gradient-text leading-snug line-clamp-2">
							{contract.title}
						</h3>
						{contract.solicitationNumber && (
							<p className="text-xs text-slate-700">
								Notice ID: {contract.solicitationNumber}
							</p>
						)}
					</div>

					{/* Meta — location first; vertical dividers between fields */}
					<div className="flex flex-wrap items-center text-xs text-slate-700">
						{placeLabel && (
							<>
								<span className="inline-flex items-center gap-1.5 min-w-0">
									<MapPin
										className="h-3.5 w-3.5 shrink-0 text-red"
										aria-hidden
									/>
									<span className="truncate">{placeLabel}</span>
								</span>
								<span
									className="mx-2.5 h-3 w-px shrink-0 bg-slate-300"
									aria-hidden
								/>
							</>
						)}
						<span className="inline-flex items-center gap-1.5">
							<Calendar
								className="h-3.5 w-3.5 shrink-0 text-[#0f5384]"
								aria-hidden
							/>
							<span>Posted {formatContractDate(contract.postedDate)}</span>
						</span>
						{contract.naicsCode && (
							<>
								<span
									className="mx-2.5 h-3 w-px shrink-0 bg-slate-300"
									aria-hidden
								/>
								<span className="inline-flex items-center gap-1.5">
									<FileText
										className="h-3.5 w-3.5 shrink-0 text-slate-500"
										aria-hidden
									/>
									<span>NAICS {contract.naicsCode}</span>
								</span>
							</>
						)}
					</div>

					{contract.award && (
						<div className="rounded-md border border-green/20 bg-green/10 px-3 py-2">
							<div className="flex items-center gap-2 text-xs font-medium text-green">
								<DollarSign className="h-3.5 w-3.5 shrink-0" aria-hidden />
								<span>
									Award information available
									{contract.award.amount
										? ` · ${formatContractAmount(contract.award.amount)}`
										: ""}
								</span>
							</div>
						</div>
					)}

					{/* Actions — divider above; View | SAM.gov left, Save right */}
					<div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200/60 pt-3">
						<div className="flex items-center gap-0 min-w-0">
							<button
								type="button"
								onClick={handleViewDetails}
								className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-[#0f5384] transition-colors cursor-pointer"
							>
								<Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
								View details
							</button>
							{contract.uiLink && (
								<>
									<span
										className="mx-2.5 h-3 w-px shrink-0 bg-slate-300"
										aria-hidden
									/>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											window.open(contract.uiLink, "_blank");
										}}
										className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-[#0f5384] transition-colors cursor-pointer"
									>
										SAM.gov
										<ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
									</button>
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

function SamContractsTable({
	contracts,
	onViewDocument,
}: {
	contracts: SAMContract[];
	onViewDocument: (contract: SAMContract) => void;
}) {
	return (
		<div className="overflow-x-auto rounded-lg border border-slate-200 bg-white/80">
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
						<th className="px-4 py-3 font-medium">Title</th>
						<th className="px-4 py-3 font-medium hidden md:table-cell">
							Location
						</th>
						<th className="px-4 py-3 font-medium hidden lg:table-cell">
							Posted
						</th>
						<th className="px-4 py-3 font-medium">Due</th>
						<th className="px-4 py-3 font-medium text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{contracts.map((contract, index) => {
						const placeLabel = getPlaceLabel(contract);
						return (
							<tr
								key={
									contract.noticeId ||
									contract.solicitationNumber ||
									`${contract.title?.slice(0, 20)}-${index}`
								}
								className="border-t border-slate-200/60 hover:bg-blue-50/40 transition-colors"
							>
								<td className="px-4 py-3 min-w-0">
									<p className="font-medium text-slate-700 line-clamp-2">
										{contract.title}
									</p>
									{contract.solicitationNumber && (
										<p className="text-xs text-slate-500 mt-0.5">
											{contract.solicitationNumber}
										</p>
									)}
								</td>
								<td className="px-4 py-3 text-slate-700 hidden md:table-cell">
									{placeLabel || "—"}
								</td>
								<td className="px-4 py-3 text-slate-700 hidden lg:table-cell">
									{formatContractDate(contract.postedDate)}
								</td>
								<td className="px-4 py-3 text-slate-700">
									{contract.responseDeadLine
										? formatContractDate(contract.responseDeadLine)
										: "—"}
								</td>
								<td className="px-4 py-3">
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
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
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
			limit: 24,
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

	// Remove auto-search - only search when button is clicked
	// useEffect(() => {
	//   if (searchFilters.keyword && searchFilters.keyword.length >= 2) {
	//     const timeoutId = setTimeout(async () => {
	//       try {
	//         // Only set loading state if we don't have results yet
	//         if (contracts.length === 0) {
	//           // Add a small delay before showing loading to prevent flickering
	//           const loadingTimeoutId = setTimeout(() => {
	//             setIsNewSearch(true);
	//           }, 100);
	//
	//           // Execute search with enhanced filters
	//           const cleanFilters: UseSAMOpportunitiesFilters = Object.fromEntries(
	//             Object.entries(searchFilters).filter(([key, value]) => {
	//               if (typeof value === 'string') {
	//                 return value !== '' && value !== 'all';
	//               }
	//               if (typeof value === 'number') {
	//                 return key === 'limit' || key === 'offset' || value > 0;
	//               }
	//               return value !== null && value !== undefined;
	//             })
	//           ) as UseSAMOpportunitiesFilters;

	//           await searchOpportunities(cleanFilters);
	//           clearTimeout(loadingTimeoutId);
	//           setIsNewSearch(false);
	//         } else {
	//           // If we have results, just update without showing loading
	//           const cleanFilters: UseSAMOpportunitiesFilters = Object.fromEntries(
	//             Object.entries(searchFilters).filter(([key, value]) => {
	//               if (typeof value === 'string') {
	//                 return value !== '' && value !== 'all';
	//               }
	//               if (typeof value === 'number') {
	//                 return key === 'limit' || key === 'offset' || value > 0;
	//               }
	//               return value !== null && value !== undefined;
	//             })
	//           ) as UseSAMOpportunitiesFilters;

	//           await searchOpportunities(cleanFilters);
	//         }
	//       } catch (err) {
	//         console.error('Enhanced SAM search failed:', err);
	//         setIsNewSearch(false);
	//       }
	//     }, 500); // 500ms debounce for better UX

	//     return () => clearTimeout(timeoutId);
	//   }
	// }, [
	//   searchFilters.keyword,
	//   searchFilters.procurementType,
	//   searchFilters.setAsideType,
	//   searchFilters.state,
	//   searchFilters.organizationName,
	//   searchFilters.responseDeadlineOption,
	//   searchOpportunities,
	//   contracts.length,
	// ]);

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
			cleaned.limit = filters.limit || 24;
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
			limit: 24,
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
						Advanced Resources
					</h1>
					<p className="text-slate-600 mt-1">
						Search and explore government contract opportunities from SAM.gov
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
								Search Contracts
							</CardTitle>
							{activeFilterChips.length > 0 && (
								<span className="inline-block shrink-0 px-2 py-0.5 text-xs rounded-full font-medium border bg-green/10 text-green border-green/20">
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
										<div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
											{keywordSuggestions.map((term) => (
												<button
													key={term}
													type="button"
													className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-200/60 last:border-b-0"
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
										<div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
											{organizationSuggestions.map((org) => (
												<button
													key={org.name}
													type="button"
													className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-200/60 last:border-b-0"
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
										className="inline-flex items-center gap-1.5 rounded-md border border-green/20 bg-green/10 px-2.5 py-1 text-xs font-medium text-green transition-colors hover:bg-green/20 cursor-pointer"
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

						{/* Action Buttons — right-aligned */}
						<div className="flex flex-wrap items-center justify-end gap-3">
							<Button
								onClick={handleSearch}
								disabled={loading}
								className="flex items-center gap-2 btn-primary px-3 sm:px-4"
							>
								{loading ? (
									<RefreshCw className="h-4 w-4 animate-spin" />
								) : (
									<Search className="h-4 w-4" />
								)}
								Search Contracts
							</Button>
							<Button
								onClick={handleReset}
								className="flex items-center gap-2 btn-primary px-3 sm:px-4"
							>
								<RefreshCw className="h-4 w-4" />
								Reset
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Enhanced Error Display with Setup Instructions */}
			{error && (
				<div className="space-y-4">
					<Card className="bg-red-50 border border-red-200">
						<CardContent className="p-4">
							<div className="flex items-center gap-2 text-red-800 mb-3">
								<AlertCircle className="h-5 w-5" />
								<span className="font-medium">Unable to load contracts</span>
							</div>
							<p className="text-red-700 mb-3">
								We're experiencing technical difficulties loading contract
								information. Please try again in a few moments. If the problem
								persists, contact support for assistance.
							</p>

							{/* Developer Details - IT only */}
							{isITUser && (
								<details className="mt-4">
									<summary className="cursor-pointer text-sm text-red-600 hover:text-red-800 font-medium select-none">
										Technical details (for developers)
									</summary>
									<div className="mt-3 bg-white p-4 rounded-lg border border-red-200">
										<p className="text-sm text-red-700 mb-3">
											{error || "An unknown error occurred"}
										</p>

										{/* Show setup instructions if API key is missing */}
										{error?.includes("API key") && (
											<div className="space-y-3">
												<h4 className="font-medium text-red-800">
													SAM.gov API Key Setup Required
												</h4>
												<p className="text-sm text-red-700">
													To use SAM.gov contract search, you need an API key:
												</p>
												<ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
													<li>
														Visit{" "}
														<a
															href="https://sam.gov/"
															target="_blank"
															rel="noopener noreferrer"
															className="underline"
														>
															sam.gov
														</a>{" "}
														and sign in
													</li>
													<li>Navigate to Account Details page</li>
													<li>Request an API Key (40 characters)</li>
													<li>
														Set the{" "}
														<code className="bg-red-100 px-1 rounded">
															GOV_API_KEY
														</code>{" "}
														environment variable
													</li>
													<li>Restart the development server</li>
												</ol>
												<p className="text-xs text-red-600 mt-3">
													Note: According to{" "}
													<a
														href="https://api.sam.gov/docs/api-key/"
														target="_blank"
														rel="noopener noreferrer"
														className="underline"
													>
														SAM.gov API documentation
													</a>
													, request limits apply based on your role.
												</p>
											</div>
										)}
									</div>
								</details>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{hasSearched && !error && (
				<div className="space-y-4">
					{/* Control bar — mirrors ContractsControlBar / LicensesControlBar row */}
					<div className="flex pt-2 pb-1 gap-3 justify-between flex-wrap items-center">
						<div className="flex items-center gap-3 flex-wrap min-w-0">
							<p className="font-medium text-slate-700">
								{totalRecords.toLocaleString()} contracts found
							</p>
							<div className="flex items-center gap-2 text-green">
								<span
									className="size-2 rounded-full bg-green animate-pulse"
									aria-hidden
								/>
								<span className="text-sm text-slate-700">
									Live SAM.gov data
								</span>
							</div>
						</div>
						<div className="flex items-center gap-2 justify-end flex-wrap">
							<Select
								value={resultsSort}
								onValueChange={(value) => setResultsSort(value as SamSortValue)}
							>
								<SelectTrigger className="sort-select h-10! w-auto sm:w-45">
									<SelectValue placeholder="Sort" />
								</SelectTrigger>
								<SelectContent className="sort-select-content">
									{SAM_SORT_OPTIONS.map((opt) => (
										<SelectItem
											key={opt.value}
											value={opt.value}
											className="shad-select-item text-slate-700"
										>
											Sort: {opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FilesViewToggle
								view={resultsView}
								onViewChange={setResultsView}
							/>
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
									<SamContractsTable
										contracts={sortedContracts}
										onViewDocument={handleViewDocument}
									/>
								)}
								<PageIndex
									className="mt-6 justify-center"
									page={(searchFilters.offset || 0) + 1}
									totalItems={totalRecords}
									pageSize={searchFilters.limit || 24}
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

			{/* Enhanced Initial State - Hidden by default */}
			{false && !hasSearched && !loading && (
				<div className="space-y-6">
					<Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
						<CardContent className="p-8 text-center">
							<Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-slate-700 mb-2">
								Search Government Contracts
							</h3>
							<p className="text-slate-500 mb-4">
								Enter search criteria above and click &ldquo;Search
								Contracts&rdquo; to find contract opportunities from SAM.gov
							</p>

							{/* Feature Highlights */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
								<div className="flex items-center gap-2 text-slate-600">
									<Search className="h-4 w-4 text-blue-500" />
									<span>Manual search with button click</span>
								</div>
								<div className="flex items-center gap-2 text-slate-600">
									<Calendar className="h-4 w-4 text-green-500" />
									<span>Response deadline filtering</span>
								</div>
								<div className="flex items-center gap-2 text-slate-600">
									<Building2 className="h-4 w-4 text-purple-500" />
									<span>Enhanced set-aside codes</span>
								</div>
							</div>
						</CardContent>
					</Card>
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
