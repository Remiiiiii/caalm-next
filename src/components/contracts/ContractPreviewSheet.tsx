"use client";

import {
	Building2,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	Clock,
	DollarSign,
	ExternalLink,
	FileText,
	FolderOpen,
	PanelRightClose,
	PanelRightOpen,
	Scale,
	Shield,
	Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import ManagerAvatars from "@/components/ManagerAvatars";
import Thumbnail from "@/components/Thumbnail";
import { Button } from "@/components/ui/button";
import type { AppUser } from "@/lib/actions/user.actions";
import { fetchUserNamesByIds } from "@/lib/actions/user.actions";
import {
	daysToExpiry,
	fileTypeGlyphLabel,
	formatValueAbbrev,
	getExpiryTier,
} from "@/lib/contracts/contract-card-format";
import {
	getStatusBadgeClasses,
	getStatusLabel,
} from "@/lib/contracts/contract-status-display";
import {
	parseWorkflowStateJson,
	progressSubtext,
} from "@/lib/contracts/contractLifecycleDisplay";
import { formatExpiryTypeLabel } from "@/lib/expiry/expiry-format";
import { cn, convertFileSize, getProfilePictureUrl } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";

const DocumentViewer = dynamic(() => import("@/components/DocumentViewer"), {
	ssr: false,
	loading: () => null,
});

// pdf.js only (no Adobe Embed / browser PDF chrome) — same worker as DocumentViewerInner.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ContractPreviewSheetProps = {
	file: UIFileDoc;
	/** Omit in dialog context — the row only renders when there's somewhere to go back to. */
	backLabel?: string;
	onBack?: () => void;
};

type FieldType =
	| "text"
	| "date"
	| "currency"
	| "boolean"
	| "array"
	| "priority"
	| "compliance"
	| "mono";

type FieldDef = {
	label: string;
	value: unknown;
	type?: FieldType;
	fullWidth?: boolean;
};

type SectionId =
	| "file-info"
	| "documents"
	| "contract-info"
	| "dates"
	| "terms"
	| "counterparty"
	| "financial"
	| "organization"
	| "compliance"
	| "insurance"
	| "approval"
	| "performance";

type SectionDef = {
	id: SectionId;
	navLabel: string;
	title: string;
	icon: React.ComponentType<{ className?: string }>;
};

type Cluster = { label: string; sections: SectionDef[] };

const CLUSTERS: Cluster[] = [
	{
		label: "THE FILE",
		sections: [
			{
				id: "file-info",
				navLabel: "File info",
				title: "File information",
				icon: FolderOpen,
			},
			{
				id: "documents",
				navLabel: "Documents",
				title: "Related documents",
				icon: FileText,
			},
		],
	},
	{
		label: "THE CONTRACT",
		sections: [
			{
				id: "contract-info",
				navLabel: "Contract info",
				title: "Contract information",
				icon: ClipboardList,
			},
			{
				id: "dates",
				navLabel: "Dates",
				title: "Dates & timeline",
				icon: Clock,
			},
			{
				id: "terms",
				navLabel: "Terms",
				title: "Contract terms",
				icon: FileText,
			},
		],
	},
	{
		label: "PARTIES & MONEY",
		sections: [
			{
				id: "counterparty",
				navLabel: "Counterparty",
				title: "Counterparty",
				icon: Building2,
			},
			{
				id: "financial",
				navLabel: "Financial",
				title: "Financial details",
				icon: DollarSign,
			},
			{
				id: "organization",
				navLabel: "Organization",
				title: "Organization",
				icon: Users,
			},
		],
	},
	{
		label: "RISK & LEGAL",
		sections: [
			{
				id: "compliance",
				navLabel: "Compliance",
				title: "Compliance & risk",
				icon: Shield,
			},
			{
				id: "insurance",
				navLabel: "Insurance",
				title: "Insurance & legal",
				icon: Scale,
			},
		],
	},
	{
		label: "PROCESS",
		sections: [
			{
				id: "approval",
				navLabel: "Approval",
				title: "Approval & workflow",
				icon: ClipboardList,
			},
			{
				id: "performance",
				navLabel: "Performance",
				title: "Performance & metrics",
				icon: FileText,
			},
		],
	},
];

const ALL_SECTIONS = CLUSTERS.flatMap((c) => c.sections);
const SCROLL_SPY_OFFSET = 16;
const COLLAPSE_STORAGE_KEY = "contractPreviewSheet:documentPaneCollapsed";
const DOCUMENT_PANE_ID = "contract-preview-document-pane";

function isEmptyValue(value: unknown): boolean {
	if (value === null || value === undefined || value === "") return true;
	if (Array.isArray(value)) return value.length === 0;
	return false;
}

function formatFieldValue(value: unknown, type?: FieldType): string | null {
	if (isEmptyValue(value)) return null;
	switch (type) {
		case "boolean":
			return value === true ? "Yes" : value === false ? "No" : null;
		case "array":
			return Array.isArray(value) ? value.join(", ") : String(value);
		case "date": {
			try {
				const raw = String(value);
				const iso = raw.includes("T") ? raw : `${raw}T12:00:00`;
				const date = new Date(iso);
				if (Number.isNaN(date.getTime())) return raw;
				return date.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				});
			} catch {
				return String(value);
			}
		}
		case "currency":
			return typeof value === "number"
				? `$${value.toLocaleString("en-US", {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}`
				: String(value);
		case "priority": {
			const v = String(value).toLowerCase();
			if (v === "urgent") return "Urgent";
			if (v === "high") return "High";
			if (v === "medium") return "Medium";
			if (v === "low") return "Low";
			return String(value);
		}
		case "compliance": {
			const v = String(value).toLowerCase();
			if (v === "up-to-date" || v === "compliant") return "Low risk";
			if (v === "action-required" || v === "at-risk") return "Medium risk";
			if (v === "non-compliant") return "High risk";
			return String(value);
		}
		default:
			return String(value);
	}
}

/** Fields with no value are hidden; caller summarizes what's hidden in one muted line. */
function buildHiddenFieldsLine(hiddenLabels: string[]): string | null {
	if (hiddenLabels.length === 0) return null;
	if (hiddenLabels.length <= 3) {
		return `${hiddenLabels.join(", ")} not recorded · ${hiddenLabels.length} field${
			hiddenLabels.length > 1 ? "s" : ""
		} hidden`;
	}
	return `${hiddenLabels.length} fields hidden`;
}

function FieldRow({ label, value, type, fullWidth }: FieldDef) {
	const display = formatFieldValue(value, type);
	if (display === null) return null;
	return (
		<div className={fullWidth ? "sm:col-span-2" : undefined}>
			<dt className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.06em] text-slate-400">
				{label}
			</dt>
			<dd
				className={cn(
					"text-[12.5px] font-semibold text-slate-700 wrap-break-word",
					type === "mono" && "font-mono",
				)}
			>
				{display}
			</dd>
		</div>
	);
}

type SectionExtra = { label: string; node: ReactNode; populated: boolean };

function Section({
	def,
	fields,
	extra,
	registerRef,
}: {
	def: SectionDef;
	fields: FieldDef[];
	extra?: SectionExtra;
	registerRef: (id: string, el: HTMLElement | null) => void;
}) {
	const hiddenLabels = fields
		.filter((f) => isEmptyValue(f.value))
		.map((f) => f.label);
	const visibleFields = fields.filter((f) => !isEmptyValue(f.value));
	const populatedCount = visibleFields.length + (extra?.populated ? 1 : 0);
	const hiddenLine = buildHiddenFieldsLine(hiddenLabels);

	return (
		<section
			id={def.id}
			ref={(el) => registerRef(def.id, el)}
			data-preview-section={def.id}
			className="scroll-mt-4 space-y-4"
		>
			<div className="flex items-baseline justify-between gap-2 border-b border-slate-200/70 pb-2">
				<h2 className="text-[13px] font-bold text-slate-700">{def.title}</h2>
				<span className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-slate-400">
					{populatedCount === 0
						? "no data"
						: `${populatedCount} field${populatedCount > 1 ? "s" : ""}`}
				</span>
			</div>

			{populatedCount === 0 ? (
				<p className="text-xs text-slate-400">
					Nothing recorded for this section.
				</p>
			) : (
				<>
					<dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
						{visibleFields.map((f) => (
							<FieldRow key={f.label} {...f} />
						))}
						{extra?.populated && (
							<div>
								<dt className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.06em] text-slate-400">
									{extra.label}
								</dt>
								<dd>{extra.node}</dd>
							</div>
						)}
					</dl>
					{hiddenLine && (
						<p className="text-[11.5px] text-slate-400">{hiddenLine}</p>
					)}
				</>
			)}
		</section>
	);
}

export default function ContractPreviewSheet({
	file,
	backLabel,
	onBack,
}: ContractPreviewSheetProps) {
	const [activeSection, setActiveSection] = useState<SectionId>("file-info");
	const [ownerName, setOwnerName] = useState<string | null>(null);
	const [assignedManagerUsers, setAssignedManagerUsers] = useState<AppUser[]>(
		[],
	);
	const [managerProfileImages, setManagerProfileImages] = useState<
		Record<string, string>
	>({});
	const [failedProfileImages, setFailedProfileImages] = useState<Set<string>>(
		new Set(),
	);
	const [documentPaneCollapsed, setDocumentPaneCollapsed] = useState(false);
	const [fullViewerOpen, setFullViewerOpen] = useState(false);

	const metadataPaneRef = useRef<HTMLDivElement>(null);
	const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
	const registerSectionRef = useCallback(
		(id: string, el: HTMLElement | null) => {
			if (el) sectionRefs.current.set(id, el);
			else sectionRefs.current.delete(id);
		},
		[],
	);

	useEffect(() => {
		try {
			const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
			if (stored === "1") setDocumentPaneCollapsed(true);
		} catch {
			// localStorage unavailable — default expanded.
		}
	}, []);

	const toggleDocumentPane = useCallback(() => {
		setDocumentPaneCollapsed((prev) => {
			const next = !prev;
			try {
				window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
			} catch {
				// Best-effort only.
			}
			return next;
		});
	}, []);

	// Owner name — resolve once per owner reference.
	useEffect(() => {
		let cancelled = false;
		void (async () => {
			if (typeof file.owner === "string" && file.owner) {
				try {
					const users = await fetchUserNamesByIds([file.owner]);
					if (!cancelled)
						setOwnerName(users[0]?.fullName || (file.owner as string));
				} catch {
					if (!cancelled) setOwnerName(file.owner as string);
				}
			} else if (file.owner && typeof file.owner === "object") {
				if (!cancelled) setOwnerName(file.owner.fullName || null);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [file.owner]);

	// Assigned managers — resolved for the Organization section's avatar stack.
	const assignedManagerIds = useMemo(
		() => file.assignedManagers || [],
		[file.assignedManagers],
	);
	useEffect(() => {
		if (assignedManagerIds.length === 0) {
			setAssignedManagerUsers([]);
			return;
		}
		let cancelled = false;
		void (async () => {
			try {
				const users = await fetchUserNamesByIds(assignedManagerIds);
				if (cancelled) return;
				setAssignedManagerUsers(users);
				const images: Record<string, string> = {};
				for (const user of users) {
					const url = getProfilePictureUrl(
						(user as { profileImageId?: string }).profileImageId,
					);
					if (url) {
						images[user.$id] = url;
						if (user.accountId) images[user.accountId] = url;
					}
				}
				setManagerProfileImages(images);
			} catch {
				// Avatars are a nice-to-have.
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [assignedManagerIds]);

	const handleManagerImageError = useCallback(
		(userId: string, accountId?: string) => {
			setFailedProfileImages((prev) => {
				const next = new Set(prev);
				next.add(userId);
				if (accountId) next.add(accountId);
				return next;
			});
		},
		[],
	);

	const scrollToSection = useCallback((id: string) => {
		setActiveSection(id as SectionId);
		const pane = metadataPaneRef.current;
		const el = sectionRefs.current.get(id);
		if (!pane || !el) return;
		pane.scrollTo({
			top: Math.max(0, el.offsetTop - SCROLL_SPY_OFFSET),
			behavior: "smooth",
		});
	}, []);

	// Scroll-spy scoped to the metadata pane only — never window scroll.
	useEffect(() => {
		const pane = metadataPaneRef.current;
		if (!pane) return;
		const onScroll = () => {
			const scrollTop = pane.scrollTop + SCROLL_SPY_OFFSET + 1;
			let current: string | null = null;
			for (const def of ALL_SECTIONS) {
				const el = sectionRefs.current.get(def.id);
				if (el && el.offsetTop <= scrollTop) current = def.id;
			}
			if (current) {
				setActiveSection((prev) =>
					prev === current ? prev : (current as SectionId),
				);
			}
		};
		pane.addEventListener("scroll", onScroll, { passive: true });
		return () => pane.removeEventListener("scroll", onScroll);
	}, []);

	const workflowState = parseWorkflowStateJson(file.approvalWorkflowState);
	const workflowSummary = workflowState
		? [
				workflowState.steps[workflowState.currentStepIndex]?.label &&
					`Current step: ${workflowState.steps[workflowState.currentStepIndex]?.label}`,
				progressSubtext(workflowState),
			]
				.filter(Boolean)
				.join(" · ") || null
		: null;

	const days = daysToExpiry(file.contractExpiryDate);
	const tier = getExpiryTier(days);
	const expiryTone =
		tier === "expired"
			? "text-red"
			: tier === "warn"
				? "text-orange"
				: "text-slate-700";
	const expiryLabel = tier === "expired" ? "EXPIRED" : "EXPIRES IN";
	const expiryFigure =
		days === null ? "—" : days < 0 ? `${Math.abs(days)}d ago` : `${days}d`;

	const amountFmt = formatValueAbbrev(file.amount ?? null);
	const displayTitle = file.contractName || file.name || "Untitled";
	const glyphLabel = fileTypeGlyphLabel(file.extension, file.type);
	const uploadedDate = file.$createdAt
		? new Date(file.$createdAt).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			})
		: null;
	const sizeLabel =
		typeof file.size === "number" && file.size > 0
			? convertFileSize({ sizeInBytes: file.size })
			: null;
	const metaLine = [
		uploadedDate ? `Uploaded ${uploadedDate}` : null,
		sizeLabel,
		ownerName,
	]
		.filter(Boolean)
		.join(" · ");

	// One field-definition source feeds both the nav's field counts and the
	// metadata pane's rendered sections, so they can never disagree.
	const sectionFields: Record<SectionId, FieldDef[]> = {
		"file-info": [
			{ label: "Owner", value: ownerName },
			{ label: "Created", value: file.$createdAt, type: "date" },
			{ label: "Last modified", value: file.$updatedAt, type: "date" },
			{ label: "File ID", value: file.bucketFileId, type: "mono" },
			{ label: "Extension", value: file.extension },
			{ label: "Size", value: sizeLabel },
			{ label: "AI synopsis", value: file.aiSynopsis, fullWidth: true },
		],
		documents: [
			{
				label: "Related document IDs",
				value: file.relatedDocumentIds,
				type: "array",
			},
			{
				label: "Attachment references",
				value: file.attachmentReferences,
				type: "array",
			},
			{ label: "Parent contract ID", value: file.parentContractId },
			{ label: "Template used", value: file.templateUsed },
			{ label: "Version number", value: file.versionNumber },
		],
		"contract-info": [
			{ label: "Priority", value: file.priority, type: "priority" },
			{ label: "Contract amount", value: file.amount, type: "currency" },
			{
				label: "Contract type",
				value: file.contractType
					? formatExpiryTypeLabel(file.contractType)
					: null,
			},
			{ label: "Vendor/Supplier", value: file.vendor },
			{ label: "Department", value: file.department },
			{ label: "Contract number", value: file.contractNumber },
			{ label: "Contract name", value: file.contractName },
			{ label: "Status", value: file.status },
			{ label: "Lifecycle status", value: file.lifecycleStatus },
			{ label: "Contract category", value: file.contractCategory },
			{ label: "Description", value: file.description, fullWidth: true },
		],
		dates: [
			{ label: "Expiry date", value: file.contractExpiryDate, type: "date" },
			{ label: "Start date", value: file.startDate, type: "date" },
			{ label: "Execution date", value: file.executionDate, type: "date" },
			{ label: "Days until expiry", value: days === null ? null : days },
		],
		terms: [
			{ label: "Auto renew", value: file.autoRenew, type: "boolean" },
			{ label: "Renewal notice days", value: file.renewalNoticeDays },
			{
				label: "Termination notice days",
				value: file.terminationNoticeDays,
			},
			{ label: "Termination rights", value: file.terminationRights },
			{ label: "Cure period days", value: file.curePeriodDays },
			{
				label: "Post-termination obligations",
				value: file.postTerminationObligations,
				fullWidth: true,
			},
		],
		counterparty: [
			{ label: "Legal name", value: file.counterpartyLegalName },
			{ label: "Contact title", value: file.counterpartyContactTitle },
			{ label: "Contact email", value: file.counterpartyContactEmail },
			{ label: "Contact phone", value: file.counterpartyContactPhone },
			{ label: "Address", value: file.counterpartyAddress },
			{ label: "Type", value: file.counterpartyType },
			{ label: "Tax ID", value: file.counterpartyTaxId, type: "mono" },
			{
				label: "DUNS number",
				value: file.counterpartyDunsNumber,
				type: "mono",
			},
		],
		financial: [
			{ label: "Currency code", value: file.currencyCode },
			{
				label: "Not to exceed amount",
				value: file.notToExceedAmount,
				type: "currency",
			},
			{ label: "Payment terms", value: file.paymentTerms },
			{ label: "Payment schedule", value: file.paymentSchedule },
			{ label: "Budget code", value: file.budgetCode },
			{ label: "Cost center", value: file.costCenter },
		],
		organization: [
			{ label: "Contract owner", value: ownerName },
			{ label: "Department owner", value: file.departmentOwner },
			{ label: "Business unit", value: file.businessUnit },
			{ label: "Sub department", value: file.subDepartment },
			{ label: "Division", value: file.division },
		],
		compliance: [
			{
				label: "Compliance status",
				value: file.compliance,
				type: "compliance",
			},
			{ label: "Risk level", value: file.riskLevel },
			{
				label: "Regulatory requirements",
				value: file.regulatoryRequirements,
			},
			{ label: "HIPAA required", value: file.hipaaRequired, type: "boolean" },
			{
				label: "Data privacy requirements",
				value: file.dataPrivacyRequirements,
			},
		],
		insurance: [
			{
				label: "Insurance required",
				value: file.insuranceRequired,
				type: "boolean",
			},
			{
				label: "Insurance verified date",
				value: file.insuranceVerifiedDate,
				type: "date",
			},
			{
				label: "Insurance expiry date",
				value: file.insuranceExpiryDate,
				type: "date",
			},
			{
				label: "Coverage per incident",
				value: file.insuranceCoveragePerIncident,
				type: "currency",
			},
			{
				label: "Coverage aggregate",
				value: file.insuranceCoverageAggregate,
				type: "currency",
			},
			{
				label: "Indemnification included",
				value: file.indemnificationIncluded,
				type: "boolean",
			},
			{
				label: "Background check required",
				value: file.backgroundCheckRequired,
				type: "boolean",
			},
		],
		approval: [
			{ label: "Approval workflow", value: workflowSummary, fullWidth: true },
			{ label: "Current approval stage", value: file.currentApprovalStage },
			{
				label: "Internal approver IDs",
				value: file.internalApproverIds,
				type: "array",
			},
			{
				label: "Approval history log",
				value: file.approvalHistoryLog,
				fullWidth: true,
			},
			{ label: "Reviewer comments", value: file.reviewerComments },
			{
				label: "Digital signature status",
				value: file.digitalSignatureStatus,
			},
		],
		performance: [
			{
				label: "Service level agreements",
				value: file.serviceLevelAgreements,
				fullWidth: true,
			},
			{
				label: "Performance metrics",
				value: file.performanceMetrics,
				fullWidth: true,
			},
			{
				label: "Reporting requirements",
				value: file.reportingRequirements,
			},
			{
				label: "Audit rights granted",
				value: file.auditRightsGranted,
				type: "boolean",
			},
			{
				label: "Key obligations",
				value: file.keyObligations,
				type: "array",
				fullWidth: true,
			},
		],
	};

	const organizationExtra: SectionExtra = {
		label: "Assigned to",
		populated: assignedManagerUsers.length > 0,
		node: (
			<ManagerAvatars
				managers={assignedManagerUsers}
				profileImages={managerProfileImages}
				failedImages={failedProfileImages}
				onImageError={handleManagerImageError}
			/>
		),
	};

	const sectionPopulatedCount = (id: SectionId): number => {
		const fields = sectionFields[id];
		const extra = id === "organization" ? organizationExtra : undefined;
		return (
			fields.filter((f) => !isEmptyValue(f.value)).length +
			(extra?.populated ? 1 : 0)
		);
	};

	return (
		<div className="glass-card flex h-full min-h-0 flex-col overflow-hidden">
			<div className="glass-card-cap" />

			{/* Row 1 — back */}
			{onBack && backLabel && (
				<div className="shrink-0 px-5 pt-4">
					<button
						type="button"
						onClick={onBack}
						className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-600"
					>
						<ChevronLeft className="h-4 w-4" aria-hidden />
						{backLabel}
					</button>
				</div>
			)}

			{/* Row 2 — identity, Row 3 — meta */}
			<div className="shrink-0 px-5 pb-4 pt-3 text-center">
				<div className="flex items-center justify-center gap-2.5">
					<Thumbnail
						type={file.type}
						extension={file.extension}
						url={file.url}
						className="size-7.5! min-w-7.5! shrink-0 rounded-lg!"
						imageClassName="size-6!"
					/>
					<h1 className="text-lg font-bold leading-tight text-slate-700 wrap-break-word">
						{displayTitle}
					</h1>
					<span
						aria-hidden="true"
						className="shrink-0 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
					>
						{glyphLabel}
					</span>
				</div>
				{metaLine && (
					<p className="mt-1.5 text-[11.5px] text-slate-500">{metaLine}</p>
				)}
			</div>

			{/* Zone 2 — summary band: one surface, vertical dividers only */}
			<dl className="grid shrink-0 grid-cols-2 border-y border-slate-200/70 bg-white/25 sm:grid-cols-4">
				<div className="border-slate-200/70 px-4 py-3 max-sm:border-b sm:border-r">
					<dt className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
						Status
					</dt>
					<dd>
						{file.status ? (
							<span
								className={cn(
									"inline-block rounded-full border px-2 py-0.5 text-xs",
									getStatusBadgeClasses(file.status),
								)}
							>
								{getStatusLabel(file.status)}
							</span>
						) : (
							<span className="text-sm text-slate-400">—</span>
						)}
					</dd>
				</div>
				<div className="border-slate-200/70 px-4 py-3 max-sm:border-b sm:border-r">
					<dt className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
						Contract amount
					</dt>
					<dd className="text-lg font-bold tabular-nums text-slate-700">
						<span aria-hidden="true">{amountFmt.display}</span>
						<span className="sr-only">{amountFmt.accessible}</span>
					</dd>
				</div>
				<div className="border-slate-200/70 px-4 py-3 sm:border-r">
					<dt className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
						{expiryLabel}
					</dt>
					<dd className={cn("text-lg font-bold tabular-nums", expiryTone)}>
						{expiryFigure}
					</dd>
				</div>
				<div className="px-4 py-3">
					<dt className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
						Counterparty
					</dt>
					<dd className="truncate text-sm font-semibold text-slate-700">
						{file.vendor || "—"}
					</dd>
					{file.contractType && (
						<dd className="truncate text-xs text-slate-400">
							{formatExpiryTypeLabel(file.contractType)}
						</dd>
					)}
				</div>
			</dl>

			{/* Zone 3 — three-pane body */}
			<div
				className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[var(--nav-w)_minmax(0,1fr)_var(--doc-w)] lg:[transition:grid-template-columns_300ms]"
				style={
					{
						"--nav-w": "208px",
						"--doc-w": documentPaneCollapsed ? "44px" : "420px",
					} as CSSProperties
				}
			>
				{/* 3a — nav */}
				<nav
					aria-label="Details sections"
					className="remove-scrollbar hidden flex-col gap-3 overflow-y-auto border-r border-slate-200/70 bg-white/20 p-3 lg:flex"
				>
					{CLUSTERS.map((cluster) => (
						<div key={cluster.label}>
							<p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
								{cluster.label}
							</p>
							<ul className="space-y-0.5">
								{cluster.sections.map((section) => {
									const Icon = section.icon;
									const active = activeSection === section.id;
									const count = sectionPopulatedCount(section.id);
									return (
										<li key={section.id}>
											<button
												type="button"
												onClick={() => scrollToSection(section.id)}
												aria-current={active ? "true" : undefined}
												className={cn(
													"flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors",
													"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
													active
														? "bg-blue/10 font-medium text-[#0f5384]"
														: "text-slate-600 hover:bg-white/60 hover:text-slate-700",
												)}
											>
												<Icon
													className={cn(
														"h-3.5 w-3.5 shrink-0",
														active ? "text-[#0f5384]" : "text-slate-400",
													)}
												/>
												<span className="min-w-0 flex-1 truncate">
													{section.navLabel}
												</span>
												{count === 0 ? (
													<span className="shrink-0 text-[10px] italic text-slate-300">
														none
														<span className="sr-only">no data recorded</span>
													</span>
												) : (
													<span className="shrink-0 text-[10px] text-slate-400">
														{count}
													</span>
												)}
											</button>
										</li>
									);
								})}
							</ul>
						</div>
					))}
				</nav>

				{/* Mobile section select */}
				<div className="shrink-0 border-b border-slate-200/70 px-4 py-2 lg:hidden">
					<select
						aria-label="Jump to section"
						value={activeSection}
						onChange={(e) => scrollToSection(e.target.value)}
						className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
					>
						{ALL_SECTIONS.map((s) => (
							<option key={s.id} value={s.id}>
								{s.title}
							</option>
						))}
					</select>
				</div>

				{/* 3b — metadata pane */}
				<div
					ref={metadataPaneRef}
					role="region"
					aria-label="Contract details"
					// biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region must be keyboard-scrollable without a pointer, per spec
					tabIndex={0}
					className="relative min-h-0 flex-1 space-y-7 overflow-y-auto bg-white/10 px-5 py-5"
				>
					{ALL_SECTIONS.map((def) => (
						<Section
							key={def.id}
							def={def}
							registerRef={registerSectionRef}
							fields={sectionFields[def.id]}
							extra={def.id === "organization" ? organizationExtra : undefined}
						/>
					))}
				</div>

				{/* 3c — document pane */}
				<div className="hidden min-w-0 flex-col overflow-hidden border-l border-slate-200/70 bg-white/20 lg:flex">
					{documentPaneCollapsed ? (
						<button
							type="button"
							onClick={toggleDocumentPane}
							aria-expanded={false}
							aria-controls={DOCUMENT_PANE_ID}
							aria-label="Expand document pane"
							className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 text-slate-400 hover:text-slate-600"
						>
							<PanelRightOpen className="h-4 w-4" aria-hidden />
							<span className="[writing-mode:vertical-rl] text-[10px] font-semibold tracking-widest">
								DOCUMENT
							</span>
						</button>
					) : (
						<DocumentPane
							fileUrl={file.url}
							onCollapse={toggleDocumentPane}
							onOpenFull={() => setFullViewerOpen(true)}
						/>
					)}
				</div>
			</div>

			{fullViewerOpen && file.url && (
				<DocumentViewer
					isOpen={fullViewerOpen}
					onClose={() => setFullViewerOpen(false)}
					assistantMode="contract"
					file={{
						id: file.$id,
						name: displayTitle,
						type: file.extension || file.type,
						size: sizeLabel || "",
						url: file.url,
						createdAt: file.$createdAt,
						expiresAt: file.contractExpiryDate,
						createdBy: ownerName || "",
						description: file.description,
					}}
				/>
			)}
		</div>
	);
}

type DocumentPaneProps = {
	fileUrl: string;
	onCollapse: () => void;
	onOpenFull: () => void;
};

/** Document pane: blob-fetched pdf.js preview, reference only — not the reading path. */
function DocumentPane({ fileUrl, onCollapse, onOpenFull }: DocumentPaneProps) {
	const [pdfViewerFile, setPdfViewerFile] = useState<string | null>(null);
	const [numPages, setNumPages] = useState<number | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageWidth, setPageWidth] = useState(300);
	const [error, setError] = useState(false);

	const scrollRef = useRef<HTMLDivElement>(null);
	const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

	const measureWidth = useCallback(() => {
		const el = scrollRef.current;
		if (el) setPageWidth(Math.max(120, el.clientWidth - 24));
	}, []);

	useEffect(() => {
		measureWidth();
		window.addEventListener("resize", measureWidth);
		return () => window.removeEventListener("resize", measureWidth);
	}, [measureWidth]);

	useEffect(() => {
		setPdfViewerFile(null);
		setNumPages(null);
		setCurrentPage(1);
		setError(false);
		if (!fileUrl) return;
		if (
			fileUrl.startsWith("blob:") ||
			fileUrl.startsWith("data:") ||
			fileUrl.startsWith("file://")
		) {
			setPdfViewerFile(fileUrl);
			return;
		}
		let cancelled = false;
		let blobUrl: string | null = null;
		void (async () => {
			try {
				const response = await fetch(fileUrl, { credentials: "include" });
				if (cancelled || !response.ok) {
					if (!cancelled) setPdfViewerFile(fileUrl);
					return;
				}
				const buffer = await response.arrayBuffer();
				if (cancelled) return;
				blobUrl = URL.createObjectURL(
					new Blob([buffer], { type: "application/octet-stream" }),
				);
				setPdfViewerFile(blobUrl);
			} catch {
				if (!cancelled) setPdfViewerFile(fileUrl);
			}
		})();
		return () => {
			cancelled = true;
			if (blobUrl) URL.revokeObjectURL(blobUrl);
		};
	}, [fileUrl]);

	/** Page top relative to the scroll pane — not el.offsetTop, whose offsetParent may not be the pane. */
	const pageTopInPane = useCallback(
		(el: HTMLDivElement, pane: HTMLDivElement) => {
			return (
				el.getBoundingClientRect().top -
				pane.getBoundingClientRect().top +
				pane.scrollTop
			);
		},
		[],
	);

	useEffect(() => {
		const pane = scrollRef.current;
		if (!pane || !numPages) return;
		const onScroll = () => {
			const top = pane.scrollTop + 8;
			let current = 1;
			for (let page = 1; page <= numPages; page++) {
				const el = pageRefs.current.get(page);
				if (el && pageTopInPane(el, pane) <= top) current = page;
			}
			setCurrentPage((prev) => (prev === current ? prev : current));
		};
		pane.addEventListener("scroll", onScroll, { passive: true });
		return () => pane.removeEventListener("scroll", onScroll);
	}, [numPages, pageTopInPane]);

	const goToPage = useCallback(
		(page: number) => {
			const pane = scrollRef.current;
			const el = pageRefs.current.get(page);
			if (pane && el)
				pane.scrollTo({
					top: Math.max(0, pageTopInPane(el, pane) - 8),
					behavior: "smooth",
				});
		},
		[pageTopInPane],
	);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div
				id={DOCUMENT_PANE_ID}
				className="flex shrink-0 items-center gap-1 border-b border-slate-200/70 px-1.5 py-1.5"
			>
				<button
					type="button"
					onClick={onCollapse}
					aria-expanded={true}
					aria-controls={DOCUMENT_PANE_ID}
					aria-label="Collapse document pane"
					className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-white/60 hover:text-slate-700"
				>
					<PanelRightClose className="h-4 w-4" aria-hidden />
				</button>
				{numPages && numPages > 1 && (
					<div className="flex shrink-0 items-center gap-0.5">
						<button
							type="button"
							onClick={() => goToPage(Math.max(1, currentPage - 1))}
							disabled={currentPage <= 1}
							aria-label="Previous page"
							className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
						>
							<ChevronLeft className="h-3.5 w-3.5" aria-hidden />
						</button>
						<button
							type="button"
							onClick={() => goToPage(Math.min(numPages, currentPage + 1))}
							disabled={currentPage >= numPages}
							aria-label="Next page"
							className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
						>
							<ChevronRight className="h-3.5 w-3.5" aria-hidden />
						</button>
					</div>
				)}
				<span className="min-w-0 flex-1 truncate text-center text-[11px] tabular-nums text-slate-500">
					{numPages ? `Page ${currentPage} of ${numPages}` : ""}
				</span>
				<button
					type="button"
					onClick={measureWidth}
					className="shrink-0 cursor-pointer rounded px-1.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-white/60 hover:text-slate-700"
				>
					Fit
				</button>
				<button
					type="button"
					onClick={onOpenFull}
					className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium text-[#0f5384] hover:bg-white/60"
				>
					<ExternalLink className="h-3.5 w-3.5" aria-hidden />
					Open full
				</button>
			</div>

			<div
				ref={scrollRef}
				role="region"
				aria-label="Document preview"
				className="remove-scrollbar min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-3"
			>
				{!fileUrl ? (
					<p className="pt-8 text-center text-xs text-slate-400">
						No document on file for this record.
					</p>
				) : !pdfViewerFile ? (
					<div className="flex h-32 items-center justify-center text-xs text-slate-400">
						Loading document…
					</div>
				) : (
					<Document
						file={pdfViewerFile}
						onLoadSuccess={({ numPages: total }) => setNumPages(total)}
						onLoadError={() => setError(true)}
						loading={
							<div className="flex h-32 items-center justify-center text-xs text-slate-400">
								Loading document…
							</div>
						}
					>
						{error ? (
							<p className="pt-8 text-center text-xs text-red">
								Failed to load this document.
							</p>
						) : (
							Array.from({ length: numPages ?? 0 }, (_, index) => (
								<div
									key={`page-${index + 1}`}
									ref={(el) => {
										if (el) pageRefs.current.set(index + 1, el);
										else pageRefs.current.delete(index + 1);
									}}
									aria-hidden="true"
									className="mb-3 flex justify-center last:mb-0"
								>
									<Page
										pageNumber={index + 1}
										width={pageWidth}
										renderTextLayer={false}
										renderAnnotationLayer={false}
										className="rounded border border-slate-200 bg-white shadow-sm"
									/>
								</div>
							))
						)}
					</Document>
				)}
			</div>
		</div>
	);
}
