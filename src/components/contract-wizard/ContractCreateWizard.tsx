"use client";

import {
	ArrowLeft,
	ArrowRight,
	ChevronDown,
	ChevronUp,
	FilePlus,
	FileStack,
	FileText,
	Inbox,
	Plus,
	Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { InjectLibraryDialog } from "@/components/contract-wizard/InjectLibraryDialog";
import { WizardStepper } from "@/components/contract-wizard/WizardStepper";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDepartmentAssignment } from "@/hooks/useDepartmentAssignment";
import { CONTRACT_TYPE_CONFIGS } from "@/lib/contracts/contractTypeConfigs";
import {
	emptyWizardPayload,
	injectClauseFamily,
	injectTemplateSlots,
	moveSection,
	validateIntake,
} from "@/lib/templates/assemble-contract";
import { WIZARD_STEP_COUNT } from "@/lib/templates/constants";
import { cn } from "@/lib/utils";
import type { Clause } from "@/types/clauses";
import type {
	AssemblyResult,
	ContractTemplate,
	WizardIntake,
	WizardPayload,
	WizardSession,
} from "@/types/contract-templates";

const FIELD =
	"border-[0.25px] border-slate-300 hover:border-blue-300 focus-visible:border-[#078FAB]";

async function readError(response: Response): Promise<string> {
	const body = await response.json().catch(() => ({}));
	return body.error || "Something went wrong";
}

function activateOnKey(handler: () => void) {
	return (event: KeyboardEvent) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handler();
		}
	};
}

export function ContractCreateWizard() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const { departmentEnums } = useDepartmentAssignment();

	const [session, setSession] = useState<WizardSession | null>(null);
	const [payload, setPayload] = useState<WizardPayload>(emptyWizardPayload);
	const [step, setStep] = useState(0);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [injectOpen, setInjectOpen] = useState(false);
	const [pendingResume, setPendingResume] = useState<WizardSession | null>(
		null,
	);
	const [templates, setTemplates] = useState<ContractTemplate[]>([]);
	const [preview, setPreview] = useState<AssemblyResult | null>(null);
	const [previewing, setPreviewing] = useState(false);

	const startSession = useCallback(
		async (opts?: {
			startPath?: "scratch" | "template";
			templateId?: string;
		}) => {
			const response = await fetch("/api/contracts/wizard", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(opts || { startPath: "scratch" }),
			});
			if (!response.ok) throw new Error(await readError(response));
			const body = await response.json();
			const next = body.session as WizardSession;
			setSession(next);
			setPayload(next.payload);
			setStep(next.currentStep);
			return next;
		},
		[],
	);

	useEffect(() => {
		let cancelled = false;
		async function boot() {
			try {
				const sessionId = searchParams.get("session");
				const templateId = searchParams.get("template");
				if (sessionId) {
					const response = await fetch(`/api/contracts/wizard/${sessionId}`);
					if (!response.ok) throw new Error(await readError(response));
					const body = await response.json();
					if (cancelled) return;
					setSession(body.session);
					setPayload(body.session.payload);
					setStep(body.session.currentStep);
					return;
				}
				if (templateId) {
					await startSession({ startPath: "template", templateId });
					return;
				}
				const listed = await fetch("/api/contracts/wizard");
				const listedBody = await listed.json().catch(() => ({}));
				const open = (listedBody.sessions || [])[0] as
					| WizardSession
					| undefined;
				const wantFresh = searchParams.get("fresh") === "1";
				if (open && !wantFresh && !cancelled) {
					setPendingResume(open);
					return;
				}
				await startSession({ startPath: "scratch" });
			} catch (error) {
				toast({
					title: "Could not start the wizard",
					description: error instanceof Error ? error.message : "Try again",
					variant: "destructive",
				});
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		void boot();
		return () => {
			cancelled = true;
		};
	}, [searchParams, startSession, toast]);

	useEffect(() => {
		void fetch("/api/contracts/wizard?publishedTemplates=1")
			.then((r) => r.json())
			.then((body) => setTemplates(body.items || []))
			.catch(() => setTemplates([]));
	}, []);

	const save = useCallback(
		async (nextPayload: WizardPayload, nextStep = step) => {
			if (!session) return;
			setSaving(true);
			try {
				const response = await fetch(`/api/contracts/wizard/${session.$id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						payload: nextPayload,
						currentStep: nextStep,
					}),
				});
				if (!response.ok) throw new Error(await readError(response));
				const body = await response.json();
				setSession(body.session);
				setPayload(body.session.payload);
				setStep(body.session.currentStep);
			} catch (error) {
				toast({
					title: "Could not save progress",
					description: error instanceof Error ? error.message : "Try again",
					variant: "destructive",
				});
			} finally {
				setSaving(false);
			}
		},
		[session, step, toast],
	);

	const loadPreview = useCallback(async () => {
		if (!session) return;
		setPreviewing(true);
		try {
			const response = await fetch(
				`/api/contracts/wizard/${session.$id}/preview`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ payload }),
				},
			);
			if (!response.ok) throw new Error(await readError(response));
			const body = await response.json();
			setPreview(body.assembly);
		} catch (error) {
			toast({
				title: "Could not assemble a preview",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setPreviewing(false);
		}
	}, [payload, session, toast]);

	useEffect(() => {
		if (step === 3 && session) void loadPreview();
	}, [step, session, loadPreview]);

	const goNext = async () => {
		if (step === 1) {
			const errors = validateIntake(payload.intake);
			if (errors.length > 0) {
				toast({ title: errors[0], variant: "destructive" });
				return;
			}
		}
		const next = Math.min(WIZARD_STEP_COUNT - 1, step + 1);
		await save(payload, next);
	};

	const goBack = async () => {
		const next = Math.max(0, step - 1);
		await save(payload, next);
	};

	const chooseStartPath = (startPath: WizardPayload["startPath"]) => {
		const next: WizardPayload = { ...payload, startPath };
		setPayload(next);
		void save(next, 1);
	};

	const patchIntake = (field: keyof WizardIntake, value: string) => {
		setPayload({
			...payload,
			intake: { ...payload.intake, [field]: value },
		});
	};

	const continueDraft = (draft: WizardSession) => {
		setSession(draft);
		setPayload(draft.payload);
		setStep(draft.currentStep);
		setPendingResume(null);
	};

	const startFresh = () => {
		setPendingResume(null);
		void startSession({ startPath: "scratch" });
	};

	const applyTemplate = async (
		template: ContractTemplate,
		replace: boolean,
	) => {
		const next: WizardPayload = {
			...payload,
			startPath:
				replace && payload.sections.length === 0
					? "template"
					: payload.startPath,
			templateId: payload.templateId || template.$id,
			intake: {
				...payload.intake,
				contractType: payload.intake.contractType || template.contractType,
			},
			sections: replace
				? injectTemplateSlots([], template.clauseSlots, template.$id)
				: injectTemplateSlots(
						payload.sections,
						template.clauseSlots,
						template.$id,
					),
		};
		setPayload(next);
		await save(next, Math.max(step, 2));
	};

	const submit = async () => {
		if (!session) return;
		setSaving(true);
		try {
			const response = await fetch(
				`/api/contracts/wizard/${session.$id}/submit`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ payload }),
				},
			);
			if (!response.ok) throw new Error(await readError(response));
			const body = await response.json();
			toast({
				title: "Draft sent for review",
				description:
					"A new contract was created. Existing records were not changed.",
			});
			router.push("/contracts/approvals");
			return body;
		} catch (error) {
			toast({
				title: "Could not submit",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const injectClause = (clause: Clause) => {
		const next = {
			...payload,
			sections: injectClauseFamily(payload.sections, clause.familyId),
		};
		setPayload(next);
		void save(next, 2);
	};

	const enabledCount = payload.sections.filter((row) => row.enabled).length;

	const typeLabel = useMemo(() => {
		return Object.fromEntries(
			CONTRACT_TYPE_CONFIGS.map((row) => [row.id, row.label]),
		);
	}, []);

	if (loading) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="space-y-3 p-4 sm:p-6">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (!session && pendingResume) {
		const resumeName =
			pendingResume.payload.intake.contractName.trim() || "Untitled draft";
		return (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card
					className="glass-card interactive-glass-card"
					tabIndex={0}
					role="button"
					aria-label={`Continue ${resumeName}`}
					onClick={() => continueDraft(pendingResume)}
					onKeyDown={activateOnKey(() => continueDraft(pendingResume))}
				>
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<FileText className="h-6 w-6 text-[#0f5384]" />
						<p className="mt-3 text-sm font-medium sidebar-gradient-text">
							Continue draft
						</p>
						<p className="mt-1 text-sm text-slate-600">
							Pick up {resumeName}. Nothing has been submitted yet.
						</p>
					</CardContent>
				</Card>
				<Card
					className="glass-card interactive-glass-card"
					tabIndex={0}
					role="button"
					aria-label="Start a new contract"
					onClick={startFresh}
					onKeyDown={activateOnKey(startFresh)}
				>
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<FilePlus className="h-6 w-6 text-[#0f5384]" />
						<p className="mt-3 text-sm font-medium sidebar-gradient-text">
							Start a new contract
						</p>
						<p className="mt-1 text-sm text-slate-600">
							Leave the other draft in progress. This still creates a new
							contract on submit.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div>
			<WizardStepper
				currentStep={step}
				onSelect={(next) => {
					void save(payload, next);
				}}
			/>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="space-y-6 p-4 sm:p-6">
					{step === 0 && (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<Card
								className="glass-card interactive-glass-card"
								tabIndex={0}
								role="button"
								aria-label="Start from scratch"
								onClick={() => chooseStartPath("scratch")}
								onKeyDown={activateOnKey(() => chooseStartPath("scratch"))}
							>
								<div className="glass-card-cap" />
								<CardContent className="p-4 sm:p-6">
									<FilePlus className="h-6 w-6 text-[#0f5384]" />
									<p className="mt-3 text-sm font-medium sidebar-gradient-text">
										Start from scratch
									</p>
									<p className="mt-1 text-sm text-slate-600">
										Answer a short intake form, then inject templates or clauses
										as you go.
									</p>
								</CardContent>
							</Card>
							<Card
								className="glass-card interactive-glass-card"
								tabIndex={0}
								role="button"
								aria-label="Start from a template"
								onClick={() => chooseStartPath("template")}
								onKeyDown={activateOnKey(() => chooseStartPath("template"))}
							>
								<div className="glass-card-cap" />
								<CardContent className="p-4 sm:p-6">
									<FileStack className="h-6 w-6 text-[#0f5384]" />
									<p className="mt-3 text-sm font-medium sidebar-gradient-text">
										Start from a template
									</p>
									<p className="mt-1 text-sm text-slate-600">
										Pick a published recipe. You can still inject more language
										before review.
									</p>
								</CardContent>
							</Card>
						</div>
					)}

					{step === 1 && (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div className="md:col-span-2">
								<Label className="text-slate-700">Contract name</Label>
								<Input
									className={cn("mt-1", FIELD)}
									value={payload.intake.contractName}
									onChange={(event) =>
										patchIntake("contractName", event.target.value)
									}
								/>
							</div>
							<div>
								<Label className="text-slate-700">Type</Label>
								<Select
									value={payload.intake.contractType}
									onValueChange={(value) => patchIntake("contractType", value)}
								>
									<SelectTrigger className={cn("mt-1", FIELD)}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{CONTRACT_TYPE_CONFIGS.map((type) => (
											<SelectItem key={type.id} value={type.id}>
												{type.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label className="text-slate-700">Department</Label>
								<Select
									value={payload.intake.department || "__none"}
									onValueChange={(value) =>
										patchIntake("department", value === "__none" ? "" : value)
									}
								>
									<SelectTrigger className={cn("mt-1", FIELD)}>
										<SelectValue placeholder="Select department" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__none">Not set</SelectItem>
										{departmentEnums?.map((dept) => (
											<SelectItem key={dept} value={dept}>
												{dept}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label className="text-slate-700">Other party</Label>
								<Input
									className={cn("mt-1", FIELD)}
									value={payload.intake.counterparty}
									onChange={(event) =>
										patchIntake("counterparty", event.target.value)
									}
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label className="text-slate-700">Amount</Label>
									<Input
										className={cn("mt-1", FIELD)}
										value={payload.intake.amount}
										onChange={(event) =>
											patchIntake("amount", event.target.value)
										}
									/>
								</div>
								<div>
									<Label className="text-slate-700">Currency</Label>
									<Input
										className={cn("mt-1", FIELD)}
										value={payload.intake.currency}
										onChange={(event) =>
											patchIntake("currency", event.target.value)
										}
									/>
								</div>
							</div>
							<div>
								<Label className="text-slate-700">Start date</Label>
								<Input
									type="date"
									className={cn("mt-1", FIELD)}
									value={payload.intake.startDate}
									onChange={(event) =>
										patchIntake("startDate", event.target.value)
									}
								/>
							</div>
							<div>
								<Label className="text-slate-700">Expiry date</Label>
								<Input
									type="date"
									className={cn("mt-1", FIELD)}
									value={payload.intake.expiryDate}
									onChange={(event) =>
										patchIntake("expiryDate", event.target.value)
									}
								/>
							</div>
							<div>
								<Label className="text-slate-700">Governing law</Label>
								<Input
									className={cn("mt-1", FIELD)}
									value={payload.intake.governingLaw}
									onChange={(event) =>
										patchIntake("governingLaw", event.target.value)
									}
								/>
							</div>
							<div className="md:col-span-2">
								<Label className="text-slate-700">Notes for reviewers</Label>
								<Textarea
									className={cn("mt-1 min-h-24", FIELD)}
									value={payload.intake.description}
									onChange={(event) =>
										patchIntake("description", event.target.value)
									}
								/>
							</div>
						</div>
					)}

					{step === 2 && (
						<div className="space-y-6">
							{payload.startPath === "template" &&
								payload.sections.length === 0 && (
									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										{templates.length === 0 && (
											<p className="text-sm text-slate-600">
												No published templates yet. Start from scratch, or ask
												legal to publish a recipe.
											</p>
										)}
										{templates.map((template) => (
											<Card
												key={template.$id}
												className="glass-card interactive-glass-card"
												tabIndex={0}
												role="button"
												aria-label={`Use template ${template.name}`}
												onClick={() => void applyTemplate(template, true)}
												onKeyDown={activateOnKey(() => {
													void applyTemplate(template, true);
												})}
											>
												<div className="glass-card-cap" />
												<CardContent className="p-4 sm:p-6">
													<p className="text-sm font-medium sidebar-gradient-text">
														{template.name}
													</p>
													<p className="mt-1 text-sm text-slate-600">
														{template.description ||
															`${template.clauseSlots.length} clauses`}
													</p>
													<p className="mt-2 text-xs text-slate-500">
														{typeLabel[template.contractType] ||
															template.contractType}
													</p>
												</CardContent>
											</Card>
										))}
									</div>
								)}

							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-sm text-slate-600">
									{enabledCount} clause{enabledCount === 1 ? "" : "s"} in this
									draft. Inject more at any time.
								</p>
								<Button
									type="button"
									className="primary-btn cursor-pointer px-3 sm:px-4"
									onClick={() => setInjectOpen(true)}
								>
									<Plus className="h-4 w-4" />
									Inject template or clause
								</Button>
							</div>

							{payload.sections.length === 0 ? (
								<div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white/70 py-10 text-center">
									<Inbox className="h-8 w-8 text-[#0f5384]" />
									<p className="text-sm text-slate-600">
										Nothing in the draft yet. Inject a template or a clause.
									</p>
								</div>
							) : (
								<ul className="space-y-3">
									{payload.sections.map((section, index) => (
										<li
											key={`${section.familyId}-${index}`}
											className="rounded-lg border border-slate-200 bg-white p-4"
										>
											<div className="flex flex-wrap items-start justify-between gap-3">
												<div>
													<p className="font-medium text-slate-700">
														{index + 1}. {section.familyId}
													</p>
													<p className="mt-1 text-xs text-slate-500">
														{section.source === "injected"
															? "Injected along the way"
															: "From the starting template"}
														{section.required ? " · required" : " · optional"}
													</p>
												</div>
												<div className="flex items-center gap-2">
													<Button
														type="button"
														variant="outline"
														className="primary-btn cursor-pointer px-2"
														aria-label="Move up"
														onClick={() =>
															setPayload({
																...payload,
																sections: moveSection(
																	payload.sections,
																	index,
																	-1,
																),
															})
														}
													>
														<ChevronUp className="h-4 w-4" />
													</Button>
													<Button
														type="button"
														variant="outline"
														className="primary-btn cursor-pointer px-2"
														aria-label="Move down"
														onClick={() =>
															setPayload({
																...payload,
																sections: moveSection(
																	payload.sections,
																	index,
																	1,
																),
															})
														}
													>
														<ChevronDown className="h-4 w-4" />
													</Button>
													{!section.required && (
														<Button
															type="button"
															variant="outline"
															className="primary-btn cursor-pointer px-2"
															aria-label="Remove"
															onClick={() =>
																setPayload({
																	...payload,
																	sections: payload.sections.filter(
																		(_, i) => i !== index,
																	),
																})
															}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													)}
												</div>
											</div>
											<label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
												<input
													type="checkbox"
													className="cursor-pointer"
													checked={section.enabled}
													disabled={section.required}
													onChange={(event) => {
														const sections = payload.sections.map((row, i) =>
															i === index
																? { ...row, enabled: event.target.checked }
																: row,
														);
														setPayload({ ...payload, sections });
													}}
												/>
												Include in the snapshot
											</label>
										</li>
									))}
								</ul>
							)}
						</div>
					)}

					{step === 3 && (
						<div className="space-y-4">
							<p className="text-sm text-slate-600">
								Submit creates a <strong>new</strong> pending-review contract
								and a markdown snapshot of today’s published clauses. It does
								not patch a pending or active record.
							</p>
							{previewing && (
								<p className="text-sm text-slate-600">Assembling preview…</p>
							)}
							{preview && (
								<>
									<div className="flex flex-wrap gap-2">
										{preview.lineage.map((row) => (
											<span
												key={row.clauseId}
												className="inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-medium text-green"
											>
												{row.title} v{row.version}
											</span>
										))}
									</div>
									{preview.sections.some((section) => section.skipped) && (
										<ul className="space-y-1 text-sm text-slate-600">
											{preview.sections
												.filter((section) => section.skipped)
												.map((section) => (
													<li key={section.familyId}>
														<span className="inline-block rounded-full border border-orange/20 bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">
															Skipped
														</span>{" "}
														{section.title}: {section.skipReason}
													</li>
												))}
										</ul>
									)}
									<pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
										{preview.markdown}
									</pre>
								</>
							)}
						</div>
					)}

					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
						<Button
							type="button"
							variant="outline"
							className="primary-btn cursor-pointer px-3 sm:px-4"
							onClick={() => void goBack()}
							disabled={step === 0 || saving}
						>
							<ArrowLeft className="h-4 w-4" />
							Back
						</Button>
						{step < 3 ? (
							<Button
								type="button"
								className="primary-btn cursor-pointer px-3 sm:px-4"
								onClick={() => void goNext()}
								disabled={saving}
							>
								Continue
								<ArrowRight className="h-4 w-4" />
							</Button>
						) : (
							<Button
								type="button"
								className="primary-btn cursor-pointer px-3 sm:px-4"
								onClick={() => void submit()}
								disabled={saving || !preview?.lineage.length}
							>
								<FileText className="h-4 w-4" />
								Create new draft
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			<InjectLibraryDialog
				open={injectOpen}
				onOpenChange={setInjectOpen}
				excludeFamilyIds={payload.sections.map((row) => row.familyId)}
				onInjectTemplate={(template) => {
					void applyTemplate(template, false);
				}}
				onInjectClause={injectClause}
			/>
		</div>
	);
}
