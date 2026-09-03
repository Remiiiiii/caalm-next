"use client";

import {
	Calendar,
	CalendarDays,
	DollarSign,
	FilePlus,
	FileText,
	Info,
	Plus,
	Scale,
	Trash2,
	Users,
} from "lucide-react";
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	Fragment,
	type FocusEvent,
} from "react";
import { FarClausePicker } from "@/components/contract-wizard/FarClausePicker";
import { Button } from "@/components/ui/button";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { CurrencySelect } from "@/components/ui/currency-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { UsdConversionHint } from "@/components/ui/usd-conversion-hint";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDepartmentAssignment } from "@/hooks/useDepartmentAssignment";
import {
	formatAmountForDocument,
	formatAmountWhileTyping,
	getVisibleFillFields,
	GOVERNMENT_CONTRACT_TYPES,
	markLiveTokenHtml,
	parseAmountInput,
	type FillSectionId,
	type TokenGroup,
	type VisibleFillField,
} from "@/lib/templates/token-schema";
import { cn } from "@/lib/utils";
import {
	measureDocxPreviewPageCount,
	resolveDocxPreviewPage,
} from "@/lib/templates/docx-preview-pagination";
import "@/lib/templates/docx-preview.css";
import type { WizardCustomBlock, WizardIntake } from "@/types/contract-templates";

const FIELD = "border-[0.25px] border-slate-300";

/** Parse YYYY-MM-DD as a local date so the picker does not shift a day. */
function parseLocalIsoDate(value: string): Date | undefined {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
	if (!match) return undefined;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return undefined;
	}
	return date;
}

function toLocalIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

const GROUP_LABEL: Record<TokenGroup, string> = {
	record: "Record details",
	parties: "Parties",
	dates: "Dates",
	terms: "Terms",
	compensation: "Compensation",
	legal: "Legal",
	signatures: "Signatures",
};

/** Short “what to do here” copy under each section title. */
const GROUP_ACTION: Record<TokenGroup, string> = {
	record: "Enter the agreement name, department, and other record fields.",
	parties: "Name the organizations or people who are parties to this agreement.",
	dates: "Set the effective date and end date for this agreement.",
	terms: "Fill in the remaining term and scope placeholders in this section.",
	compensation: "Enter the amount, currency, and related payment fields.",
	legal: "Complete the legal placeholders that appear in this section.",
	signatures: "Review signature placeholders; they are filled at signing time.",
};

const ADDED_SECTION_ACTION =
	"Paragraphs added here appear in the agreement but aren't part of the standard blueprint.";

const SIGNATURES_NOTE =
	"Signatures are added automatically when the agreement is sent for signing.";

const GROUP_ICON: Record<TokenGroup, typeof FileText> = {
	record: FileText,
	parties: Users,
	dates: Calendar,
	terms: FileText,
	compensation: DollarSign,
	legal: Scale,
	signatures: FileText,
};

const GROUP_ORDER: TokenGroup[] = [
	"record",
	"parties",
	"dates",
	"compensation",
	"terms",
	"legal",
];

type DocumentFillSplitViewProps = {
	sessionId: string;
	blueprintId: string;
	intake: WizardIntake;
	tokenValues: Record<string, string>;
	customBlocks: WizardCustomBlock[];
	onPatchIntake: (field: keyof WizardIntake, value: string) => void;
	onPatchToken: (token: string, value: string) => void;
	onAddBlock: () => void;
	onChangeBlock: (id: string, body: string) => void;
	onRemoveBlock: (id: string) => void;
};

function fieldKey(field: VisibleFillField): string {
	return field.kind === "intake" ? field.intakeField : field.token;
}

function fieldTokens(field: VisibleFillField): string[] {
	return field.kind === "intake" ? field.tokens : [field.token];
}

function fieldValue(
	field: VisibleFillField,
	intake: WizardIntake,
	tokenValues: Record<string, string>,
): string {
	return field.kind === "intake"
		? String(intake[field.intakeField] || "")
		: String(tokenValues[field.token] || "");
}

export function DocumentFillSplitView({
	sessionId,
	blueprintId,
	intake,
	tokenValues,
	customBlocks,
	onPatchIntake,
	onPatchToken,
	onAddBlock,
	onChangeBlock,
	onRemoveBlock,
}: DocumentFillSplitViewProps) {
	const { departmentEnums } = useDepartmentAssignment();
	const fields = useMemo(
		() => getVisibleFillFields(blueprintId),
		[blueprintId],
	);
	const groups = useMemo(
		() =>
			GROUP_ORDER.map((group) => ({
				group,
				fields: fields.filter((field) => field.group === group),
			})).filter((row) => row.fields.length > 0),
		[fields],
	);

	const [section, setSection] = useState<FillSectionId>(
		groups[0]?.group || "record",
	);
	const [html, setHtml] = useState("");
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [activeToken, setActiveToken] = useState<string | null>(null);
	const [pageCount, setPageCount] = useState(1);
	const [page, setPage] = useState(1);
	const docRef = useRef<HTMLDivElement>(null);
	const inputPanelRef = useRef<HTMLElement>(null);
	const [inputPanelHeight, setInputPanelHeight] = useState<number | null>(null);
	const [syncPreviewHeight, setSyncPreviewHeight] = useState(false);

	useEffect(() => {
		const wide = window.matchMedia("(min-width: 1024px)");
		const update = () => setSyncPreviewHeight(wide.matches);
		update();
		wide.addEventListener("change", update);
		return () => wide.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		if (!syncPreviewHeight) {
			setInputPanelHeight(null);
			return;
		}
		const panel = inputPanelRef.current;
		if (!panel) return;
		const sync = () => setInputPanelHeight(panel.offsetHeight);
		sync();
		const observer = new ResizeObserver(sync);
		observer.observe(panel);
		return () => observer.disconnect();
	}, [syncPreviewHeight, section, groups]);

	useEffect(() => {
		if (section !== "added" && !groups.some((row) => row.group === section)) {
			setSection(groups[0]?.group || "record");
		}
	}, [groups, section]);

	useEffect(() => {
		const handle = window.setTimeout(() => {
			void (async () => {
				try {
					const response = await fetch(
						`/api/contracts/wizard/${sessionId}/preview-doc`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ intake, tokenValues, customBlocks }),
						},
					);
					const body = await response.json().catch(() => ({}));
					if (!response.ok) {
						throw new Error(body.error || "Could not refresh the preview");
					}
					const marked = markLiveTokenHtml(
						body.html || "",
						{
							...tokenValues,
							...Object.fromEntries(
								fields
									.filter((field) => field.kind === "intake")
									.flatMap((field) =>
										field.tokens.map((token) => [
											token,
											field.intakeField === "amount"
												? formatAmountForDocument(
														String(intake.amount || ""),
														intake.currency,
													)
												: String(intake[field.intakeField] || ""),
										]),
									),
							),
						},
					);
					setHtml(marked);
					setPreviewError(null);
				} catch (error) {
					setPreviewError(
						error instanceof Error ? error.message : "Preview failed",
					);
				}
			})();
		}, 400);
		return () => window.clearTimeout(handle);
	}, [sessionId, intake, tokenValues, customBlocks, fields]);

	useEffect(() => {
		const node = docRef.current;
		if (!node) return;
		const sync = () => {
			const nextCount = measureDocxPreviewPageCount(node);
			setPageCount(nextCount);
			setPage(resolveDocxPreviewPage(node, nextCount));
		};
		sync();
		const observer = new ResizeObserver(sync);
		observer.observe(node);
		return () => observer.disconnect();
	}, [html]);

	useEffect(() => {
		const root = docRef.current;
		if (!root) return;
		for (const node of root.querySelectorAll(".docx-live-token-active")) {
			node.classList.remove("docx-live-token-active");
		}
		if (!activeToken) return;
		const target = root.querySelector(`[data-token="${CSS.escape(activeToken)}"]`);
		if (!(target instanceof HTMLElement)) return;
		target.classList.add("docx-live-token-active");
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
	}, [activeToken, html]);

	const sectionIndex =
		section === "added"
			? groups.length
			: groups.findIndex((row) => row.group === section);
	const sectionTotal = groups.length + 1;
	const activeGroup = groups.find((row) => row.group === section);
	const sectionTitle =
		section === "added" ? "Optional paragraphs" : GROUP_LABEL[section];
	const sectionAction =
		section === "added" ? ADDED_SECTION_ACTION : GROUP_ACTION[section];

	const onFieldFocus = (field: VisibleFillField) => {
		const tokens = fieldTokens(field);
		setActiveToken(tokens[0] || null);
		if (field.group !== section) setSection(field.group);
	};

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-0">
			<aside
				ref={inputPanelRef}
				className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white lg:flex-row"
			>
				<div className="shrink-0 border-b border-slate-200 bg-slate-100/80 px-3 py-4 lg:w-14 lg:self-stretch lg:border-b-0">
					<nav
						className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
						aria-label="Agreement sections"
					>
				{groups.map((row) => {
					const Icon = GROUP_ICON[row.group];
					const required = row.fields.filter((field) => field.required);
					const complete =
						required.length > 0 &&
						required.every((field) =>
							fieldValue(field, intake, tokenValues).trim(),
						);
					const current = section === row.group;
					return (
						<button
							key={row.group}
							type="button"
							className={cn(
								"relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center transition-colors duration-200",
								current
									? "text-[#0f5384]"
									: "text-slate-500 hover:text-[#0f5384]",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
							)}
							aria-current={current ? "true" : undefined}
							aria-label={GROUP_LABEL[row.group]}
							onClick={() => setSection(row.group)}
						>
							{current && (
								<span className="absolute -left-1 hidden h-6 w-0.5 rounded-full bg-[#0f5384] lg:block" />
							)}
							<Icon className="h-4 w-4" />
							{required.length > 0 && (
								<span
									className={cn(
										"absolute top-1 right-1 h-1.5 w-1.5 rounded-full",
										complete ? "bg-green" : "bg-slate-300",
									)}
									aria-hidden
								/>
							)}
						</button>
					);
				})}
				<button
					type="button"
					className={cn(
						"relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center transition-colors duration-200",
						section === "added"
							? "text-[#0f5384]"
							: "text-slate-500 hover:text-[#0f5384]",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
					)}
					aria-current={section === "added" ? "true" : undefined}
					aria-label="Added language"
					onClick={() => setSection("added")}
				>
					{section === "added" && (
						<span className="absolute -left-1 hidden h-6 w-0.5 rounded-full bg-[#0f5384] lg:block" />
					)}
					<FilePlus className="h-4 w-4" />
				</button>
					</nav>
				</div>

				<div
					className="hidden w-px shrink-0 self-stretch bg-slate-200 lg:block"
					aria-hidden="true"
				/>

				<div className="min-w-0 flex-1 space-y-6 p-4 sm:p-6">
				{section !== "added" && (
					<div>
						<p className="text-xs text-slate-500">
							Section {sectionIndex + 1} of {sectionTotal}
						</p>
						<h2 className="text-xl font-semibold sidebar-gradient-text">
							{sectionTitle}
						</h2>
						<p className="mt-1 text-sm text-slate-600">{sectionAction}</p>
					</div>
				)}

				{activeGroup && (
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						{activeGroup.fields.map((field) => (
							<Fragment key={fieldKey(field)}>
								{field.dividerBefore ? (
									<hr className="col-span-full border-slate-200" />
								) : null}
								<FillControl
									field={field}
									intake={intake}
									tokenValues={tokenValues}
									departments={departmentEnums || []}
									active={fieldTokens(field).includes(activeToken || "")}
									onFocus={() => onFieldFocus(field)}
									onPatchIntake={onPatchIntake}
									onPatchToken={onPatchToken}
								/>
							</Fragment>
						))}
					</div>
				)}

				{section === "added" && (
					<div className="space-y-4">
						<p className="text-xs text-slate-500">
							Section {sectionIndex + 1} of {sectionTotal}
						</p>
						<div>
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								Optional paragraphs
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								{ADDED_SECTION_ACTION}
							</p>
						</div>

						{customBlocks.length === 0 ? (
							<div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8">
								<p className="text-sm text-slate-500">
									No optional paragraphs added yet
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{customBlocks.map((block) => (
									<div key={block.id} className="flex items-end gap-2">
										<Textarea
											className={cn("min-h-20", FIELD)}
											value={block.body}
											onChange={(event) =>
												onChangeBlock(block.id, event.target.value)
											}
											placeholder="Write the paragraph that should appear in the agreement…"
										/>
										<button
											type="button"
											className="mb-1 cursor-pointer rounded p-1 text-slate-400 transition-colors duration-200 hover:text-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
											aria-label="Remove paragraph"
											onClick={() => onRemoveBlock(block.id)}
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								))}
							</div>
						)}

						<div className="flex justify-end">
							<Button
								type="button"
								className="primary-btn cursor-pointer px-3 sm:px-4"
								onClick={onAddBlock}
							>
								<Plus className="h-4 w-4" />
								Add paragraph
							</Button>
						</div>
					</div>
				)}

				<div className="flex items-start gap-2 border-t border-slate-200 pt-4">
					<Info
						className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
						aria-hidden
					/>
					<p className="text-sm text-slate-600">{SIGNATURES_NOTE}</p>
				</div>
				</div>
			</aside>

			<div
				className="flex min-h-[50vh] flex-col p-4 sm:p-6 lg:min-h-0 lg:p-0 lg:pl-6 lg:pt-0"
				style={
					syncPreviewHeight && inputPanelHeight != null
						? { height: inputPanelHeight }
						: undefined
				}
			>
				<div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
					<div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
						<p className="text-sm font-medium sidebar-gradient-text">
							Live document
						</p>
						<p className="text-xs text-slate-500">
							Page {page} of {pageCount}
						</p>
					</div>
					{previewError && (
						<p className="bg-white px-4 py-2 text-sm text-red">{previewError}</p>
					)}
					<div
						ref={docRef}
						data-active-token={activeToken || ""}
						className="docx-preview docx-paginated flex-1 overflow-auto"
						onScroll={(event) => {
							const el = event.currentTarget;
							const total = measureDocxPreviewPageCount(el);
							setPageCount(total);
							setPage(resolveDocxPreviewPage(el, total));
						}}
						// Server merge output only; placeholders stay escaped by mammoth.
						dangerouslySetInnerHTML={{
							__html: html || "<p>Fill a field to see the document.</p>",
						}}
					/>
				</div>
			</div>
		</div>
	);
}

function FillControl({
	field,
	intake,
	tokenValues,
	departments,
	active,
	onFocus,
	onPatchIntake,
	onPatchToken,
}: {
	field: VisibleFillField;
	intake: WizardIntake;
	tokenValues: Record<string, string>;
	departments: string[];
	active: boolean;
	onFocus: () => void;
	onPatchIntake: (field: keyof WizardIntake, value: string) => void;
	onPatchToken: (token: string, value: string) => void;
}) {
	const value = fieldValue(field, intake, tokenValues);
	const setValue = (next: string) => {
		if (field.kind === "intake") onPatchIntake(field.intakeField, next);
		else onPatchToken(field.token, next);
	};
	const span = field.dataType === "longtext" ? "md:col-span-2" : "";
	const labelClass = cn(
		"text-slate-700",
		active && "text-[#0f5384]",
	);

	const focusProps = {
		onFocus: (_event: FocusEvent) => onFocus(),
	};

	if (field.kind === "intake" && field.intakeField === "currency") {
		return (
			<div className={span}>
				<Label className={labelClass}>{field.label}</Label>
				<div className="mt-1">
					<CurrencySelect
						value={value || "USD"}
						onValueChange={setValue}
						amount={intake.amount}
						triggerClassName={FIELD}
					/>
				</div>
			</div>
		);
	}

	if (field.kind === "intake" && field.intakeField === "department") {
		return (
			<div className={span}>
				<Label className={labelClass}>{field.label}</Label>
				<Select
					value={value || "__none"}
					onValueChange={(next) => setValue(next === "__none" ? "" : next)}
				>
					<SelectTrigger className={cn("mt-1", FIELD)} onFocus={onFocus}>
						<SelectValue placeholder="Select department" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__none">Not set</SelectItem>
						{departments.map((dept) => (
							<SelectItem key={dept} value={dept}>
								{dept}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		);
	}

	if (field.kind === "token" && field.token === "CONTRACT_TYPE") {
		return (
			<div className={span}>
				<Label className={labelClass}>{field.label}</Label>
				<Select value={value || "__none"} onValueChange={(next) => setValue(next === "__none" ? "" : next)}>
					<SelectTrigger className={cn("mt-1", FIELD)} onFocus={onFocus}>
						<SelectValue placeholder="Select contract type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__none">Not set</SelectItem>
						{GOVERNMENT_CONTRACT_TYPES.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		);
	}

	if (field.dataType === "currency") {
		return (
			<div className={span}>
				<Label className={labelClass}>{field.label}</Label>
				<Input
					type="text"
					inputMode="decimal"
					className={cn("mt-1", FIELD)}
					value={
						value
							? formatAmountWhileTyping(value, intake.currency || "USD")
							: ""
					}
					onChange={(event) => setValue(parseAmountInput(event.target.value))}
					{...focusProps}
				/>
				<UsdConversionHint
					amount={value}
					currencyCode={intake.currency || "USD"}
				/>
			</div>
		);
	}

	if (field.kind === "token" && field.token === "ADDITIONAL_FAR_CLAUSES") {
		return (
			<FarClausePicker
				value={value}
				onChange={setValue}
				onFocus={onFocus}
				label={field.label}
				labelClassName={labelClass}
			/>
		);
	}

	if (field.dataType === "longtext") {
		return (
			<div className={span}>
				<Label className={labelClass}>{field.label}</Label>
				<Textarea
					className={cn("mt-1 min-h-24", FIELD)}
					value={value}
					onChange={(event) => setValue(event.target.value)}
					{...focusProps}
				/>
			</div>
		);
	}

	if (field.dataType === "date") {
		const selected = parseLocalIsoDate(value);
		return (
			<div className={span}>
				<Label className={labelClass}>{field.label}</Label>
				<Popover
					onOpenChange={(open) => {
						if (open) onFocus();
					}}
				>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="mt-1 h-11 w-full justify-between bg-white text-sm font-normal border-slate-300 hover:border-blue-500"
							{...focusProps}
						>
							{selected
								? selected.toLocaleDateString("en-US", {
										weekday: "short",
										month: "short",
										day: "numeric",
										year: "numeric",
									})
								: `Select ${field.label.toLowerCase()}`}
							<CalendarDays className="h-4 w-4 text-slate-500" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-auto overflow-hidden border-slate-200 p-0 shadow-lg"
						align="start"
					>
						<DateCalendar
							mode="single"
							selected={selected}
							disabled={(date) => {
								const today = new Date();
								today.setHours(0, 0, 0, 0);
								const check = new Date(date);
								check.setHours(0, 0, 0, 0);
								return check < today;
							}}
							onSelect={(date) => {
								if (date) setValue(toLocalIsoDate(date));
							}}
						/>
					</PopoverContent>
				</Popover>
			</div>
		);
	}

	return (
		<div className={span}>
			<Label className={labelClass}>{field.label}</Label>
			<Input
				type="text"
				className={cn("mt-1", FIELD)}
				value={value}
				onChange={(event) => setValue(event.target.value)}
				{...focusProps}
			/>
		</div>
	);
}
