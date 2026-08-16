"use client";

import {
	AlertTriangle,
	Clock,
	FileText,
	Lock,
	Send,
	Upload,
	X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	type FormEvent,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { SubmitProgressIndicator } from "@/components/tickets/SubmitProgressIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { resolveSubmitterDepartmentLabel } from "@/lib/tickets/submitter-placement";
import type { TicketSeverity } from "@/lib/tickets/ticket.types";
import {
	deriveSeverityFromMatrix,
	TICKET_CATEGORIES,
	TICKET_IMPACT_LEVELS,
	TICKET_MODULES,
	TICKET_URGENCY_LEVELS,
} from "@/lib/tickets/ticket-intake.constants";
import { cn } from "@/lib/utils";

type MatrixLevel = "Critical" | "High" | "Medium" | "Low";

const TICKET_FIELD_CLASS =
	"bg-white !border !border-solid !border-slate-200 focus-visible:!border-[#078FAB] focus-visible:ring-1 focus-visible:ring-[#078FAB]";

const SEVERITY_BADGE: Record<MatrixLevel, string> = {
	Critical: "bg-red/10 text-red border-red/20",
	High: "bg-orange/10 text-orange border-orange/20",
	Medium: "bg-blue/10 text-blue border-blue/20",
	Low: "bg-slate-100 text-slate-600 border-slate-200",
};

const MAX_DESC = 2000;
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type AttachmentEntry = { id: string; file: File };
type TouchedFields = Partial<
	Record<"title" | "category" | "impact" | "urgency" | "description", boolean>
>;

function getInitials(name?: string | null): string {
	if (!name?.trim()) return "?";
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function matrixLevelLabel(severity: TicketSeverity): MatrixLevel {
	return (severity.charAt(0).toUpperCase() + severity.slice(1)) as MatrixLevel;
}

function RequiredMark() {
	return <span className="text-red">*</span>;
}

function FormField({
	label,
	htmlFor,
	required,
	hint,
	error,
	trailing,
	children,
}: {
	label: string;
	htmlFor?: string;
	required?: boolean;
	hint?: string;
	error?: string | null;
	trailing?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div>
			<div className="mb-1.5 flex items-baseline justify-between gap-2">
				<Label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
					{label}
					{required ? (
						<>
							{" "}
							<RequiredMark />
						</>
					) : null}
					{hint ? (
						<span className="ml-1 font-normal text-slate-500">({hint})</span>
					) : null}
				</Label>
				{trailing}
			</div>
			{children}
			{error ? <p className="mt-1 text-xs text-red">{error}</p> : null}
		</div>
	);
}

function SelectField({
	id,
	value,
	onChange,
	onBlur,
	options,
	placeholder,
	error,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	options: readonly string[];
	placeholder: string;
	error?: boolean;
}) {
	return (
		<Select
			value={value || undefined}
			onValueChange={onChange}
			onOpenChange={(open) => {
				if (!open) onBlur?.();
			}}
		>
			<SelectTrigger
				id={id}
				className={cn(
					"cursor-pointer text-slate-700 shadow-sm",
					TICKET_FIELD_CLASS,
					!value && "text-slate-500",
					error && "border-red/60!",
				)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="border-slate-200 bg-white/95 text-slate-700 shadow-xl backdrop-blur-xl">
				{options.map((option) => (
					<SelectItem
						key={option}
						value={option}
						className="shad-select-item cursor-pointer text-slate-700 focus:bg-blue/10 focus:text-slate-700"
					>
						{option}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function PillGroup({
	label,
	value,
	onChange,
	options,
	error,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: readonly { value: string; label: string }[];
	error?: string | null;
}) {
	return (
		<div>
			<p className="mb-1.5 text-xs text-slate-600">{label}</p>
			<div className="flex flex-wrap gap-1.5">
				{options.map((option) => {
					const active = value === option.value;
					return (
						<button
							key={option.value}
							type="button"
							onClick={() => onChange(option.value)}
							className={cn(
								"cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								active
									? "border-[#0f5384] bg-[#0f5384] text-white"
									: "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue/5",
							)}
						>
							{option.label}
						</button>
					);
				})}
			</div>
			{error ? <p className="mt-1 text-xs text-red">{error}</p> : null}
		</div>
	);
}

export function TicketSubmitForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { user } = useAuth();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [title, setTitle] = useState(() => searchParams.get("title") ?? "");
	const [category, setCategory] = useState(
		() => searchParams.get("category") ?? "",
	);
	const [affectedModule, setAffectedModule] = useState(
		() => searchParams.get("module") ?? "",
	);
	const [impact, setImpact] = useState("");
	const [urgency, setUrgency] = useState("");
	const [description, setDescription] = useState("");
	const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
	const [dragOver, setDragOver] = useState(false);
	const [touched, setTouched] = useState<TouchedFields>({});
	const [submitting, setSubmitting] = useState(false);
	const [submitProgress, setSubmitProgress] = useState(0);
	const [showSubmitProgress, setShowSubmitProgress] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);

	const userName = user?.name ?? "Signed-in user";
	const departmentLabel = resolveSubmitterDepartmentLabel({
		departmentLabel: user?.departmentLabel,
		department: user?.department,
		divisionLabel: user?.divisionLabel,
		division: user?.division,
	});
	const initials = getInitials(user?.name);

	const derived = useMemo(() => {
		if (!impact || !urgency) return null;
		try {
			const result = deriveSeverityFromMatrix(
				impact as TicketSeverity,
				urgency as TicketSeverity,
			);
			return {
				level: matrixLevelLabel(result.severity),
				hours: result.responseSlaHours,
			};
		} catch {
			return null;
		}
	}, [impact, urgency]);

	const errors = useMemo(
		() => ({
			title:
				title.trim().length < 3 ? "Title must be at least 3 characters." : null,
			category: category === "" ? "Choose a category." : null,
			impact: impact === "" ? "Select how many people are affected." : null,
			urgency: urgency === "" ? "Select how urgent this is." : null,
			description:
				description.trim().length < 8
					? "Description must be at least 8 characters."
					: null,
		}),
		[title, category, impact, urgency, description],
	);

	const isValid = Object.values(errors).every((item) => !item);
	const showValidationBanner = !isValid && Object.values(touched).some(Boolean);

	const addFiles = useCallback((fileList: FileList | File[]) => {
		const incoming = Array.from(fileList);
		if (incoming.length === 0) return;

		setFileError(null);
		setAttachments((prev) => {
			const next = [...prev];
			for (const file of incoming) {
				if (next.length >= MAX_FILES) {
					setFileError(`You can attach up to ${MAX_FILES} files.`);
					break;
				}
				if (file.size > MAX_FILE_BYTES) {
					setFileError(`${file.name} exceeds the 10 MB limit.`);
					continue;
				}
				next.push({
					id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
					file,
				});
			}
			return next;
		});
	}, []);

	const removeFile = useCallback((id: string) => {
		setAttachments((prev) => prev.filter((entry) => entry.id !== id));
		setFileError(null);
	}, []);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setTouched({
			title: true,
			category: true,
			impact: true,
			urgency: true,
			description: true,
		});
		if (!isValid || !derived) return;

		setSubmitting(true);
		setError(null);
		setShowSubmitProgress(true);
		setSubmitProgress(0);

		// Same simulated progress pattern as contract/license upload
		const progressInterval = setInterval(() => {
			setSubmitProgress((prev) => {
				if (prev >= 90) {
					clearInterval(progressInterval);
					return 90;
				}
				return prev + 10;
			});
		}, 200);

		try {
			const form = new FormData();
			form.set("title", title.trim());
			form.set("description", description.trim());
			form.set("category", category);
			if (affectedModule) form.set("affectedModule", affectedModule);
			form.set("impact", impact);
			form.set("urgency", urgency);

			for (const entry of attachments.slice(0, MAX_FILES)) {
				form.append("attachments", entry.file);
			}

			const res = await fetch("/api/tickets", { method: "POST", body: form });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to submit ticket");

			clearInterval(progressInterval);
			setSubmitProgress(100);
			// Brief success beat so the user sees 100% before navigating away
			await new Promise((resolve) => setTimeout(resolve, 700));
			router.push(`/tickets/${data.ticket.$id}`);
		} catch (err) {
			clearInterval(progressInterval);
			setShowSubmitProgress(false);
			setSubmitProgress(0);
			setError(err instanceof Error ? err.message : "Failed to submit ticket");
			setSubmitting(false);
		}
	};

	return (
		<div className="w-full space-y-6">
			<p className="text-sm text-slate-600">
				Your submission is logged and tracked end to end. Fields marked with an
				asterisk are required.
			</p>

			<div className="glass-card-inner flex items-center gap-3 rounded-lg border border-slate-200/60 p-3 sm:p-4">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-xs font-semibold text-[#0f5384]">
					{initials}
				</div>
				<div className="min-w-0">
					<p className="truncate text-sm font-medium text-slate-700">
						{userName}
					</p>
					<p className="truncate text-xs text-slate-600">{departmentLabel}</p>
				</div>
				<span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-slate-500">
					<Lock className="h-3 w-3" aria-hidden />
					Locked to your account
				</span>
			</div>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<form onSubmit={onSubmit} noValidate className="space-y-6">
						<FormField
							label="Title"
							htmlFor="ticket-title"
							required
							error={touched.title ? errors.title : null}
						>
							<Input
								id="ticket-title"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
								placeholder="Summary of the problem"
								maxLength={120}
								className={cn(
									TICKET_FIELD_CLASS,
									touched.title && errors.title && "border-red/60!",
								)}
							/>
						</FormField>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								label="Category"
								htmlFor="ticket-category"
								required
								error={touched.category ? errors.category : null}
							>
								<SelectField
									id="ticket-category"
									value={category}
									onChange={setCategory}
									onBlur={() =>
										setTouched((prev) => ({ ...prev, category: true }))
									}
									options={TICKET_CATEGORIES}
									placeholder="Choose a category"
									error={Boolean(touched.category && errors.category)}
								/>
							</FormField>
							<FormField
								label="Affected service"
								htmlFor="ticket-module"
								hint="optional"
							>
								<SelectField
									id="ticket-module"
									value={affectedModule}
									onChange={setAffectedModule}
									options={TICKET_MODULES}
									placeholder="Where does this happen?"
								/>
							</FormField>
						</div>

						<div>
							<p className="mb-1 text-sm font-medium text-slate-700">
								How much is this affecting people? <RequiredMark />
							</p>
							<p className="mb-3 text-xs text-slate-600">
								We use this to set severity and response time; no need to guess
								a priority level yourself.
							</p>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<PillGroup
									label="Who's affected"
									value={impact}
									onChange={(value) => {
										setImpact(value);
										setTouched((prev) => ({ ...prev, impact: true }));
									}}
									options={TICKET_IMPACT_LEVELS}
									error={touched.impact ? errors.impact : null}
								/>
								<PillGroup
									label="How urgent"
									value={urgency}
									onChange={(value) => {
										setUrgency(value);
										setTouched((prev) => ({ ...prev, urgency: true }));
									}}
									options={TICKET_URGENCY_LEVELS}
									error={touched.urgency ? errors.urgency : null}
								/>
							</div>
							{derived ? (
								<div className="mt-4 flex flex-wrap items-center gap-3">
									<span
										className={cn(
											"rounded-full border px-2.5 py-1 text-xs font-medium",
											SEVERITY_BADGE[derived.level],
										)}
									>
										{derived.level} severity
									</span>
									<span className="flex items-center gap-1 text-xs text-slate-600">
										<Clock className="h-3.5 w-3.5 text-[#0f5384]" aria-hidden />
										Expected response within {derived.hours} hours
									</span>
								</div>
							) : null}
						</div>

						<FormField
							label="Description"
							htmlFor="ticket-description"
							required
							error={touched.description ? errors.description : null}
							trailing={
								<span className="text-xs text-slate-500">
									{description.length}/{MAX_DESC}
								</span>
							}
						>
							<Textarea
								id="ticket-description"
								value={description}
								onChange={(event) =>
									setDescription(event.target.value.slice(0, MAX_DESC))
								}
								onBlur={() =>
									setTouched((prev) => ({ ...prev, description: true }))
								}
								placeholder="What happened? What did you expect instead? Steps to reproduce, if any."
								rows={5}
								className={cn(
									"min-h-32 resize-y",
									TICKET_FIELD_CLASS,
									touched.description && errors.description && "border-red/60!",
								)}
							/>
						</FormField>

						<FormField label="Attachments" hint="optional">
							<div
								role="button"
								tabIndex={0}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										fileInputRef.current?.click();
									}
								}}
								onDragOver={(event) => {
									event.preventDefault();
									setDragOver(true);
								}}
								onDragLeave={() => setDragOver(false)}
								onDrop={(event) => {
									event.preventDefault();
									setDragOver(false);
									if (event.dataTransfer.files?.length) {
										addFiles(event.dataTransfer.files);
									}
								}}
								onClick={() => fileInputRef.current?.click()}
								className={cn(
									"flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed px-4 py-7 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									dragOver
										? "border-[#0f5384] bg-blue/5"
										: "border-slate-200 hover:border-blue-300 hover:bg-blue/5",
								)}
							>
								<Upload
									className="h-5 w-5 text-slate-600"
									strokeWidth={1.5}
									aria-hidden
								/>
								<p className="text-sm text-slate-700">
									Drop files here, or click to browse
								</p>
								<p className="text-xs text-slate-500">
									Screenshots, logs, or documents up to 10 MB each (max{" "}
									{MAX_FILES} files)
								</p>
								<input
									ref={fileInputRef}
									type="file"
									multiple
									className="hidden"
									onChange={(event) => {
										if (event.target.files?.length) {
											addFiles(event.target.files);
										}
										event.target.value = "";
									}}
								/>
							</div>

							{fileError ? (
								<p className="mt-2 text-xs text-red">{fileError}</p>
							) : null}

							{attachments.length > 0 ? (
								<ul className="mt-3 space-y-1.5">
									{attachments.map((entry) => (
										<li
											key={entry.id}
											className="flex items-center gap-2 rounded-md border border-slate-200/60 bg-white/65 px-3 py-2 text-sm"
										>
											<FileText
												className="h-4 w-4 shrink-0 text-slate-600"
												aria-hidden
											/>
											<span className="truncate text-slate-700">
												{entry.file.name}
											</span>
											<span className="shrink-0 text-xs text-slate-500">
												{formatFileSize(entry.file.size)}
											</span>
											<button
												type="button"
												onClick={() => removeFile(entry.id)}
												className="ml-auto shrink-0 cursor-pointer rounded p-0.5 text-slate-500 transition-colors duration-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
												aria-label={`Remove ${entry.file.name}`}
											>
												<X className="h-4 w-4" aria-hidden />
											</button>
										</li>
									))}
								</ul>
							) : null}
						</FormField>

						{showValidationBanner ? (
							<div className="flex items-start gap-2 rounded-md border border-red/20 bg-red/10 px-3 py-2 text-sm text-red">
								<AlertTriangle
									className="mt-0.5 h-4 w-4 shrink-0"
									aria-hidden
								/>
								<span>
									Please fill in all required fields before submitting.
								</span>
							</div>
						) : null}

						{error ? (
							<div className="flex items-start gap-2 rounded-md border border-red/20 bg-red/10 px-3 py-2 text-sm text-red">
								<AlertTriangle
									className="mt-0.5 h-4 w-4 shrink-0"
									aria-hidden
								/>
								<span>{error}</span>
							</div>
						) : null}

						{showSubmitProgress ? (
							<SubmitProgressIndicator
								progress={submitProgress}
								label="Submitting ticket…"
								successLabel="Ticket submitted successfully"
							/>
						) : null}

						<div className="flex justify-end">
							<Button
								type="submit"
								className="primary-btn w-full px-3 sm:w-auto sm:px-4"
								disabled={submitting}
							>
								<Send className="h-4 w-4" aria-hidden />
								{submitting ? "Submitting…" : "Submit ticket"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
