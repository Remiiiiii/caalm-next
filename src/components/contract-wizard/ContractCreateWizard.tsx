"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	ArrowLeft,
	ArrowRight,
	FileCheck,
	FileText,
	FileBox,
	GripVertical,
	Inbox,
	Loader2,
	Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BlueprintPickerGrid } from "@/components/contract-wizard/BlueprintPickerGrid";
import { DocumentFillSplitView } from "@/components/contract-wizard/DocumentFillSplitView";
import { InjectLibraryDialog } from "@/components/contract-wizard/InjectLibraryDialog";
import { WizardDraftsList } from "@/components/contract-wizard/WizardDraftsList";
import { WizardPdfPreview } from "@/components/contract-wizard/WizardPdfPreview";
import { WizardStepper } from "@/components/contract-wizard/WizardStepper";
import { SaveProgressCard } from "@/components/SaveProgressCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
	emptyWizardPayload,
	injectClauseFamily,
	injectTemplateSlots,
} from "@/lib/templates/assemble-contract";
import type { BlueprintCatalogEntry } from "@/lib/templates/blueprint-catalog";
import { WIZARD_STEP_COUNT } from "@/lib/templates/constants";
import { validateBlueprintTokens } from "@/lib/templates/token-schema";
import type { Clause } from "@/types/clauses";
import type {
	ContractTemplate,
	WizardIntake,
	WizardPayload,
	WizardSection,
	WizardSession,
	WizardSessionSummary,
} from "@/types/contract-templates";

async function readError(response: Response): Promise<string> {
	const body = await response.json().catch(() => ({}));
	return body.error || response.statusText || "Request failed";
}

function formatSavedAgo(iso: string | null, nowMs: number): string {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	const seconds = Math.max(0, Math.round((nowMs - date.getTime()) / 1000));
	if (seconds < 5) return "Saved just now";
	if (seconds >= 60) {
		const minutes = Math.round(seconds / 60);
		return `Saved ${minutes} min ago`;
	}
	return `Saved ${seconds} s ago`;
}

export function ContractCreateWizard() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();

	const [session, setSession] = useState<WizardSession | null>(null);
	const [payload, setPayload] = useState<WizardPayload>(emptyWizardPayload);
	const [step, setStep] = useState(0);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [autosaving, setAutosaving] = useState(false);
	const [injectOpen, setInjectOpen] = useState(false);
	const [openDrafts, setOpenDrafts] = useState<WizardSessionSummary[]>([]);
	const [draftsOpen, setDraftsOpen] = useState(false);
	const [draftsLoading, setDraftsLoading] = useState(false);
	const [hasSavedDrafts, setHasSavedDrafts] = useState(false);
	const [blueprints, setBlueprints] = useState<BlueprintCatalogEntry[]>([]);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [pdfFileId, setPdfFileId] = useState<string | null>(null);
	const [previewing, setPreviewing] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [nowMs, setNowMs] = useState(() => Date.now());
	const [clauseTitlesByFamily, setClauseTitlesByFamily] = useState<
		Record<string, string>
	>({});
	const lastSavedHash = useRef("");
	const dirty = useRef(false);
	const saveGen = useRef(0);
	const stepRef = useRef(step);
	const payloadRef = useRef(payload);
	const draftsOpenRef = useRef(draftsOpen);
	const sessionRef = useRef<WizardSession | null>(null);
	const ensuringSessionRef = useRef<Promise<WizardSession> | null>(null);
	stepRef.current = step;
	payloadRef.current = payload;
	draftsOpenRef.current = draftsOpen;
	sessionRef.current = session;

	const startSession = useCallback(
		async (opts?: {
			startPath?: "scratch" | "template";
			templateId?: string;
			blueprintId?: string;
		}) => {
			const response = await fetch("/api/contracts/wizard", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(opts || { startPath: "scratch" }),
			});
			if (!response.ok) throw new Error(await readError(response));
			const body = await response.json();
			const next = body.session as WizardSession;
			sessionRef.current = next;
			setSession(next);
			setPayload(next.payload);
			setStep(next.currentStep);
			lastSavedHash.current = JSON.stringify(next.payload);
			dirty.current = false;
			return next;
		},
		[],
	);

	const ensureSession = useCallback(
		async (opts?: {
			startPath?: "scratch" | "template";
			templateId?: string;
			blueprintId?: string;
		}) => {
			if (sessionRef.current) return sessionRef.current;
			if (ensuringSessionRef.current) return ensuringSessionRef.current;
			const pending = startSession(opts);
			ensuringSessionRef.current = pending;
			try {
				return await pending;
			} finally {
				ensuringSessionRef.current = null;
			}
		},
		[startSession],
	);

	const prefetchHasSavedDrafts = useCallback(async () => {
		try {
			const response = await fetch("/api/contracts/wizard?countOnly=1", {
				cache: "no-store",
			});
			const body = await response.json().catch(() => ({}));
			setHasSavedDrafts((body.count ?? 0) > 0);
		} catch {
			// Non-blocking hint for the saved-drafts button.
		}
	}, []);

	const refreshDraftSummaries = useCallback(async () => {
		const listed = await fetch("/api/contracts/wizard?summary=1", {
			cache: "no-store",
		});
		const listedBody = await listed.json().catch(() => ({}));
		const summaries = (listedBody.summaries || []) as WizardSessionSummary[];
		setOpenDrafts(summaries);
		setHasSavedDrafts(summaries.length > 0);
		return summaries;
	}, []);

	const applyDraftSummaries = useCallback(
		(summaries: WizardSessionSummary[]) => {
			// #region agent log
			fetch(
				"http://127.0.0.1:7246/ingest/851d37c7-2223-45c1-89c0-a79ca1139a1d",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Debug-Session-Id": "cb2714",
					},
					body: JSON.stringify({
						sessionId: "cb2714",
						hypothesisId: "H2",
						location: "ContractCreateWizard.tsx:applyDraftSummaries",
						message: "applying draft summaries to state",
						data: {
							summaryCount: summaries.length,
							summaryIds: summaries.map((s) => s.$id),
						},
						timestamp: Date.now(),
					}),
				},
			).catch(() => {});
			// #endregion
			setOpenDrafts(summaries);
			setHasSavedDrafts(summaries.length > 0);
		},
		[],
	);

	const sessionQuery = searchParams.get("session");
	const templateQuery = searchParams.get("template");
	const freshQuery = searchParams.get("fresh");

	useEffect(() => {
		let cancelled = false;
		async function boot() {
			try {
				const sessionId = sessionQuery;
				const templateId = templateQuery;
				const wantFresh = freshQuery === "1";

				if (sessionId) {
					const [sessionRes, countRes] = await Promise.all([
						fetch(`/api/contracts/wizard/${sessionId}`, { cache: "no-store" }),
						fetch("/api/contracts/wizard?countOnly=1", { cache: "no-store" }),
					]);
					if (!sessionRes.ok) throw new Error(await readError(sessionRes));
					const body = await sessionRes.json();
					if (cancelled) return;
					setSession(body.session);
					setPayload(body.session.payload);
					setStep(body.session.currentStep);
					lastSavedHash.current = JSON.stringify(body.session.payload);
					const countBody = await countRes.json().catch(() => ({}));
					if (!cancelled) setHasSavedDrafts((countBody.count ?? 0) > 0);
					return;
				}

				if (templateId) {
					await startSession({ startPath: "template", templateId });
					if (!cancelled) void prefetchHasSavedDrafts();
					return;
				}

				if (wantFresh) {
					await startSession({ startPath: "scratch" });
					if (!cancelled) void prefetchHasSavedDrafts();
					return;
				}

				const listed = await fetch("/api/contracts/wizard?summary=1", {
					cache: "no-store",
				});
				const listedBody = await listed.json().catch(() => ({}));
				const summaries = (listedBody.summaries ||
					[]) as WizardSessionSummary[];
				if (!cancelled) setHasSavedDrafts(summaries.length > 0);
				if (summaries.length > 0 && !cancelled) {
					setOpenDrafts(summaries);
					setHasSavedDrafts(true);
					setDraftsOpen(true);
					return;
				}
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
	}, [
		sessionQuery,
		templateQuery,
		freshQuery,
		startSession,
		prefetchHasSavedDrafts,
		toast,
	]);

	useEffect(() => {
		void fetch("/api/contracts/wizard/blueprints")
			.then((r) => r.json())
			.then((body) => setBlueprints(body.items || []))
			.catch(() => setBlueprints([]));
	}, []);

	const save = useCallback(
		async (
			nextPayload: WizardPayload,
			nextStep = stepRef.current,
			opts?: { quiet?: boolean },
		) => {
			const activeSession = sessionRef.current;
			if (!activeSession) return;
			const gen = ++saveGen.current;
			if (opts?.quiet) setAutosaving(true);
			else setSaving(true);
			try {
				const response = await fetch(
					`/api/contracts/wizard/${activeSession.$id}`,
					{
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							payload: nextPayload,
							currentStep: nextStep,
						}),
					},
				);
				if (!response.ok) throw new Error(await readError(response));
				const body = await response.json();
				if (gen !== saveGen.current) return;
				sessionRef.current = body.session;
				setSession(body.session);
				setPayload(body.session.payload);
				setStep(body.session.currentStep);
				stepRef.current = body.session.currentStep;
				payloadRef.current = body.session.payload;
				lastSavedHash.current = JSON.stringify(body.session.payload);
				dirty.current = false;
				setNowMs(Date.now());
			} catch (error) {
				if (gen !== saveGen.current) return;
				// Quiet autosave stays silent; manual save still surfaces errors.
				if (!opts?.quiet) {
					toast({
						title: "Could not save progress",
						description: error instanceof Error ? error.message : "Try again",
						variant: "destructive",
					});
				}
			} finally {
				if (gen === saveGen.current) {
					setSaving(false);
					setAutosaving(false);
				}
			}
		},
		[toast],
	);

	useEffect(() => {
		if (!session || loading) return;
		const hash = JSON.stringify(payload);
		if (hash === lastSavedHash.current) return;
		dirty.current = true;
		const handle = window.setTimeout(() => {
			void save(payloadRef.current, stepRef.current, { quiet: true });
		}, 2000);
		return () => window.clearTimeout(handle);
	}, [payload, session, loading, save]);

	// Refresh relative “Saved Xs ago” while a draft is open.
	useEffect(() => {
		if (!session || !payload.lastSavedAt) return;
		const handle = window.setInterval(() => setNowMs(Date.now()), 15_000);
		return () => window.clearInterval(handle);
	}, [session, payload.lastSavedAt]);

	useEffect(() => {
		const onLeave = (event: BeforeUnloadEvent) => {
			if (!dirty.current) return;
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", onLeave);
		return () => window.removeEventListener("beforeunload", onLeave);
	}, []);

	const loadPdf = useCallback(async () => {
		if (!session) return;
		setPreviewing(true);
		setPreviewError(null);
		try {
			if (payload.draftPdfFileId) {
				setPdfFileId(payload.draftPdfFileId);
				setPdfUrl(
					`/api/contracts/wizard/${session.$id}/draft-file?kind=preview`,
				);
			}
			const response = await fetch(
				`/api/contracts/wizard/${session.$id}/preview-pdf`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ payload }),
				},
			);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(body.error || "Could not build PDF");
			setPdfFileId(body.fileId || null);
			setPdfUrl(body.pdfUrl || null);
		} catch (error) {
			setPreviewError(
				error instanceof Error ? error.message : "Could not build PDF",
			);
		} finally {
			setPreviewing(false);
		}
	}, [payload, session]);

	useEffect(() => {
		if (step === 3 && session && payload.blueprintId) void loadPdf();
	}, [step, session, payload.blueprintId, loadPdf]);

	// Resolve human clause titles for the inject list (familyId alone is a hex REF).
	useEffect(() => {
		if (step !== 2) return;
		let cancelled = false;
		void (async () => {
			try {
				const response = await fetch(
					"/api/contracts/wizard?publishedClauses=1",
				);
				const body = await response.json().catch(() => ({}));
				if (cancelled || !response.ok) return;
				const map: Record<string, string> = {};
				for (const clause of body.items || []) {
					if (
						clause &&
						typeof clause.familyId === "string" &&
						typeof clause.title === "string" &&
						clause.title.trim()
					) {
						map[clause.familyId] = clause.title;
					}
				}
				setClauseTitlesByFamily(map);
			} catch {
				// Keep empty map; cards fall back to the family id.
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [step]);

	const goNext = async () => {
		if (step === 0 && !payload.blueprintId) {
			toast({ title: "Choose an agreement first", variant: "destructive" });
			return;
		}
		if (step === 1) {
			const errors = validateBlueprintTokens(
				payload.blueprintId,
				payload.intake,
				payload.tokenValues,
			);
			if (errors.length > 0) {
				toast({
					title: "Fill the required fields",
					description: errors.join(". "),
					variant: "destructive",
				});
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

	const chooseBlueprint = (blueprint: BlueprintCatalogEntry) => {
		void (async () => {
			try {
				await ensureSession({ startPath: "scratch" });
				const next: WizardPayload = {
					...payloadRef.current,
					startPath: "template",
					blueprintId: blueprint.id,
					intake: {
						...payloadRef.current.intake,
						contractType: blueprint.contractTypeId,
					},
				};
				payloadRef.current = next;
				stepRef.current = 1;
				setPayload(next);
				setStep(1);
				await save(next, 1);
			} catch (error) {
				toast({
					title: "Could not start the contract",
					description: error instanceof Error ? error.message : "Try again",
					variant: "destructive",
				});
			}
		})();
	};

	const patchIntake = (field: keyof WizardIntake, value: string) => {
		setPayload((current) => ({
			...current,
			intake: { ...current.intake, [field]: value },
		}));
	};

	const patchToken = (token: string, value: string) => {
		setPayload((current) => ({
			...current,
			tokenValues: { ...current.tokenValues, [token]: value },
		}));
	};

	const continueDraft = (draft: WizardSession) => {
		sessionRef.current = draft;
		setSession(draft);
		setPayload(draft.payload);
		setStep(draft.currentStep);
		setOpenDrafts([]);
		setDraftsOpen(false);
		lastSavedHash.current = JSON.stringify(draft.payload);
		dirty.current = false;
	};

	const resumeDraft = async (summary: WizardSessionSummary) => {
		try {
			const response = await fetch(`/api/contracts/wizard/${summary.$id}`);
			if (!response.ok) throw new Error(await readError(response));
			const body = await response.json();
			continueDraft(body.session as WizardSession);
		} catch (error) {
			toast({
				title: "Could not open draft",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		}
	};

	const openSavedDrafts = async () => {
		setDraftsOpen(true);
		setDraftsLoading(true);
		try {
			const listed = await fetch("/api/contracts/wizard?summary=1", {
				cache: "no-store",
			});
			const listedBody = await listed.json().catch(() => ({}));
			const listedDrafts = (listedBody.summaries ||
				[]) as WizardSessionSummary[];
			setOpenDrafts(listedDrafts);
			setHasSavedDrafts(listedDrafts.length > 0);
		} catch {
			toast({
				title: "Could not load saved drafts",
				variant: "destructive",
			});
		} finally {
			setDraftsLoading(false);
		}
	};

	const deleteDrafts = useCallback(
		async (ids: string[]) => {
			if (ids.length === 0) return 0;
			// #region agent log
			fetch(
				"http://127.0.0.1:7246/ingest/851d37c7-2223-45c1-89c0-a79ca1139a1d",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Debug-Session-Id": "cb2714",
					},
					body: JSON.stringify({
						sessionId: "cb2714",
						hypothesisId: "H3",
						location: "ContractCreateWizard.tsx:deleteDrafts:start",
						message: "deleteDrafts called",
						data: {
							requestIds: ids,
							openDraftsLength: openDrafts.length,
							openDraftIds: openDrafts.map((d) => d.$id),
						},
						timestamp: Date.now(),
					}),
				},
			).catch(() => {});
			// #endregion
			const response = await fetch("/api/contracts/wizard", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids }),
			});
			if (!response.ok) throw new Error(await readError(response));
			const body = (await response.json()) as {
				deleted?: string[];
				failed?: string[];
				summaries?: WizardSessionSummary[];
			};
			const deleted = body.deleted ?? [];
			if (deleted.length === 0) {
				throw new Error("No drafts were deleted");
			}

			// #region agent log
			fetch(
				"http://127.0.0.1:7246/ingest/851d37c7-2223-45c1-89c0-a79ca1139a1d",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Debug-Session-Id": "cb2714",
					},
					body: JSON.stringify({
						sessionId: "cb2714",
						hypothesisId: "H1,H5",
						location: "ContractCreateWizard.tsx:deleteDrafts:response",
						message: "DELETE response received",
						data: {
							deleted,
							failed: body.failed ?? [],
							summariesInBody: body.summaries?.length ?? null,
							summaryIdsInBody: body.summaries?.map((s) => s.$id) ?? null,
							overlapDeletedStillInSummaries: (body.summaries ?? [])
								.filter((s) => deleted.includes(s.$id))
								.map((s) => s.$id),
						},
						timestamp: Date.now(),
					}),
				},
			).catch(() => {});
			// #endregion

			// Instant list update while the server response is applied.
			setOpenDrafts((current) =>
				current.filter((draft) => !deleted.includes(draft.$id)),
			);

			if ((body.failed?.length ?? 0) > 0) {
				toast({
					title: "Some drafts could not be deleted",
					description: `${body.failed?.length} draft(s) were skipped.`,
					variant: "destructive",
				});
			}
			if (session && deleted.includes(session.$id)) {
				setSession(null);
				setPayload(emptyWizardPayload());
				setStep(0);
			}

			const summaries =
				body.summaries && Array.isArray(body.summaries)
					? body.summaries
					: await refreshDraftSummaries();
			applyDraftSummaries(summaries);
			if (draftsOpenRef.current) {
				setDraftsOpen(true);
			}
			toast({
				title:
					deleted.length === 1
						? "Draft deleted"
						: `${deleted.length} drafts deleted`,
			});
			return summaries.length;
		},
		[session, toast, refreshDraftSummaries, applyDraftSummaries, openDrafts],
	);

	const handleDeleteDrafts = useCallback(
		async (ids: string[]) => {
			try {
				await deleteDrafts(ids);
			} catch (error) {
				toast({
					title: "Could not delete drafts",
					description: error instanceof Error ? error.message : "Try again",
					variant: "destructive",
				});
				throw error;
			}
		},
		[deleteDrafts, toast],
	);

	const deleteAllEmptyDrafts = useCallback(async () => {
		// #region agent log
		fetch("http://127.0.0.1:7246/ingest/851d37c7-2223-45c1-89c0-a79ca1139a1d", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Debug-Session-Id": "cb2714",
			},
			body: JSON.stringify({
				sessionId: "cb2714",
				hypothesisId: "H1-fix",
				location: "ContractCreateWizard.tsx:deleteAllEmptyDrafts:start",
				message: "deleteAllEmptyDrafts called",
				data: { openDraftsLength: openDrafts.length },
				timestamp: Date.now(),
				runId: "post-fix",
			}),
		}).catch(() => {});
		// #endregion
		const response = await fetch("/api/contracts/wizard", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ emptyOnly: true }),
		});
		if (!response.ok) throw new Error(await readError(response));
		const body = (await response.json()) as {
			deleted?: string[];
			failed?: string[];
			summaries?: WizardSessionSummary[];
		};
		const deleted = body.deleted ?? [];
		if (deleted.length === 0) {
			throw new Error("No empty drafts were deleted");
		}

		setOpenDrafts((current) =>
			current.filter((draft) => !deleted.includes(draft.$id)),
		);
		if (session && deleted.includes(session.$id)) {
			setSession(null);
			setPayload(emptyWizardPayload());
			setStep(0);
		}

		const summaries =
			body.summaries && Array.isArray(body.summaries)
				? body.summaries
				: await refreshDraftSummaries();
		applyDraftSummaries(summaries);
		if (draftsOpenRef.current) {
			setDraftsOpen(true);
		}
		// #region agent log
		fetch("http://127.0.0.1:7246/ingest/851d37c7-2223-45c1-89c0-a79ca1139a1d", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Debug-Session-Id": "cb2714",
			},
			body: JSON.stringify({
				sessionId: "cb2714",
				hypothesisId: "H1-fix",
				location: "ContractCreateWizard.tsx:deleteAllEmptyDrafts:done",
				message: "deleteAllEmptyDrafts completed",
				data: {
					deletedCount: deleted.length,
					summaryCount: summaries.length,
				},
				timestamp: Date.now(),
				runId: "post-fix",
			}),
		}).catch(() => {});
		// #endregion
		toast({
			title:
				deleted.length === 1
					? "Empty draft deleted"
					: `${deleted.length} empty drafts deleted`,
		});
	}, [
		session,
		toast,
		refreshDraftSummaries,
		applyDraftSummaries,
		openDrafts.length,
	]);

	const handleDeleteAllEmptyDrafts = useCallback(async () => {
		try {
			await deleteAllEmptyDrafts();
		} catch (error) {
			toast({
				title: "Could not delete empty drafts",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
			throw error;
		}
	}, [deleteAllEmptyDrafts, toast]);

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
			dirty.current = false;
			toast({
				title: "Draft sent for review",
				description:
					"A new contract was created. Existing records were not changed.",
			});
			router.push("/contracts/approvals");
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
		setClauseTitlesByFamily((current) => ({
			...current,
			[clause.familyId]: clause.title,
		}));
		const next = {
			...payload,
			sections: injectClauseFamily(payload.sections, clause.familyId),
		};
		setPayload(next);
		void save(next, 2);
	};

	const enabledCount = payload.sections.filter((row) => row.enabled).length;
	const isPersistBusy = saving || autosaving;
	const showSaveStatus = Boolean(session) && step > 0;
	const sectionSortIds = useMemo(
		() => payload.sections.map((section) => section.familyId),
		[payload.sections],
	);
	const sectionSensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleSectionDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = payload.sections.findIndex(
			(section) => section.familyId === active.id,
		);
		const newIndex = payload.sections.findIndex(
			(section) => section.familyId === over.id,
		);
		if (oldIndex < 0 || newIndex < 0) return;
		setPayload({
			...payload,
			sections: arrayMove(payload.sections, oldIndex, newIndex),
		});
	};

	const showBootSkeleton = loading && !session && openDrafts.length === 0;

	if (showBootSkeleton) {
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

	return (
		<div>
			<WizardStepper
				currentStep={step}
				onSelect={(next) => {
					void save(payload, next);
				}}
			/>

			{step === 0 && hasSavedDrafts && (
				<div className="mb-4 flex justify-end">
					<Button
						type="button"
						variant="outline"
						className="primary-btn w-auto! cursor-pointer px-3 sm:px-4"
						onClick={() => void openSavedDrafts()}
					>
						<Inbox className="h-4 w-4" />
						View saved drafts
					</Button>
				</div>
			)}

			{session && step > 0 && step < 3 && (
				<div className="mb-4">
					{showSaveStatus && isPersistBusy && (
						<p className="mb-2 flex items-center justify-end gap-1.5 text-sm text-slate-600">
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
							Saving...
						</p>
					)}
					{showSaveStatus && !isPersistBusy && payload.lastSavedAt && (
						<p className="mb-2 flex items-center justify-end gap-1.5 text-xs text-slate-600">
							<FileCheck className="h-3.5 w-3.5 text-green" />
							{formatSavedAgo(payload.lastSavedAt, nowMs)}
						</p>
					)}
					<SaveProgressCard
						compact
						description="Save manually anytime to pick up where you left off."
						onSave={() => void save(payload, step)}
						isSaving={isPersistBusy}
					/>
				</div>
			)}

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="space-y-6 p-4 sm:p-6">
					{step === 0 && (
						<BlueprintPickerGrid
							blueprints={blueprints}
							selectedId={payload.blueprintId}
							onSelect={chooseBlueprint}
						/>
					)}

					{step === 1 && session && payload.blueprintId && (
						<DocumentFillSplitView
							sessionId={session.$id}
							blueprintId={payload.blueprintId}
							intake={payload.intake}
							tokenValues={payload.tokenValues}
							customBlocks={payload.customBlocks}
							onPatchIntake={patchIntake}
							onPatchToken={patchToken}
							onAddBlock={() =>
								setPayload((current) => ({
									...current,
									customBlocks: [
										...current.customBlocks,
										{ id: crypto.randomUUID(), body: "" },
									],
								}))
							}
							onChangeBlock={(id, body) =>
								setPayload((current) => ({
									...current,
									customBlocks: current.customBlocks.map((block) =>
										block.id === id ? { ...block, body } : block,
									),
								}))
							}
							onRemoveBlock={(id) =>
								setPayload((current) => ({
									...current,
									customBlocks: current.customBlocks.filter(
										(block) => block.id !== id,
									),
								}))
							}
						/>
					)}

					{step === 1 && !payload.blueprintId && (
						<p className="text-sm text-slate-600">
							Go back and choose an agreement blueprint first.
						</p>
					)}

					{step === 2 && (
						<div className="space-y-6">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-sm text-slate-600">
									{enabledCount} extra clause
									{enabledCount === 1 ? "" : "s"} will append to the blueprint.
									Inject more at any time.
								</p>
								<Button
									type="button"
									className="primary-btn cursor-pointer px-3 sm:px-4"
									onClick={() => setInjectOpen(true)}
								>
									<FileBox className="h-4 w-4" />
									Inject template or clause
								</Button>
							</div>

							{payload.sections.length === 0 ? (
								<div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white/70 py-10 text-center">
									<Inbox className="h-8 w-8 text-[#0f5384]" />
									<p className="text-sm text-slate-600">
										The blueprint stands on its own. Inject a clause only if you
										need extra language.
									</p>
								</div>
							) : (
								<DndContext
									sensors={sectionSensors}
									collisionDetection={closestCenter}
									onDragEnd={handleSectionDragEnd}
								>
									<SortableContext
										items={sectionSortIds}
										strategy={verticalListSortingStrategy}
									>
										<ul className="space-y-3">
											{payload.sections.map((section, index) => (
												<SortableInjectSectionItem
													key={section.familyId}
													section={section}
													index={index}
													title={
														clauseTitlesByFamily[section.familyId] ||
														section.familyId
													}
													onToggleEnabled={(enabled) => {
														const sections = payload.sections.map((row, i) =>
															i === index ? { ...row, enabled } : row,
														);
														setPayload({ ...payload, sections });
													}}
													onRemove={() =>
														setPayload({
															...payload,
															sections: payload.sections.filter(
																(_, i) => i !== index,
															),
														})
													}
												/>
											))}
										</ul>
									</SortableContext>
								</DndContext>
							)}
						</div>
					)}

					{step === 3 && session && (
						<WizardPdfPreview
							sessionId={session.$id}
							fileName={`${payload.intake.contractName || "contract"}.pdf`}
							pdfUrl={pdfUrl}
							fileId={pdfFileId}
							loading={previewing}
							error={previewError}
						/>
					)}
				</CardContent>
				<div
					className={`flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 ${
						step >= 1 ? "sticky bottom-0 z-10" : ""
					}`}
				>
					<div className="flex flex-wrap items-center gap-3">
						{step > 0 && (
							<Button
								type="button"
								variant="outline"
								className="primary-btn cursor-pointer px-3 sm:px-4"
								onClick={() => void goBack()}
								disabled={saving}
							>
								<ArrowLeft className="h-4 w-4" />
								Back
							</Button>
						)}
					</div>
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
							disabled={saving || !payload.blueprintId}
						>
							<FileText className="h-4 w-4" />
							Create new draft
						</Button>
					)}
				</div>
			</Card>

			<Dialog open={draftsOpen} onOpenChange={setDraftsOpen}>
				<DialogContent
					closeButtonClassName="top-6 right-6 z-30"
					className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden border border-slate-200 p-0 shadow-xl"
				>
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
					<div className="mt-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 py-4">
						<div className="flex items-center gap-3 px-6">
							<Inbox className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Saved drafts
							</DialogTitle>
						</div>
						<p className="mt-1 ml-14 text-sm text-slate-600">
							Resuming a draft does not affect a pending or active contract.
						</p>
					</div>
					<WizardDraftsList
						drafts={openDrafts}
						loading={draftsLoading}
						onContinue={resumeDraft}
						onDelete={handleDeleteDrafts}
						onDeleteAllEmpty={handleDeleteAllEmptyDrafts}
					/>
				</DialogContent>
			</Dialog>

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

type SortableInjectSectionItemProps = {
	section: WizardSection;
	index: number;
	title: string;
	onToggleEnabled: (enabled: boolean) => void;
	onRemove: () => void;
};

function SortableInjectSectionItem({
	section,
	index,
	title,
	onToggleEnabled,
	onRemove,
}: SortableInjectSectionItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: section.familyId });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const sourceLabel =
		section.source === "injected" ? "Injected along the way" : "From a recipe";
	const optionLabel = section.required ? "Required" : "Optional";

	return (
		<li
			ref={setNodeRef}
			style={style}
			className={`rounded-lg border border-slate-200 bg-white p-4 transition-shadow duration-200 ${
				isDragging ? "opacity-50 shadow-lg" : "shadow-sm"
			}`}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					<p className="font-semibold text-slate-700">
						{index + 1}. {title}
					</p>
					<p className="mt-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
						REF {section.familyId}
					</p>
					<div className="mt-2 flex flex-wrap gap-1.5">
						<span className="inline-block rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
							{sourceLabel}
						</span>
						<span className="inline-block rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
							{optionLabel}
						</span>
					</div>
					<label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
						<Checkbox
							checked={section.enabled}
							disabled={section.required}
							onCheckedChange={(checked) => onToggleEnabled(checked === true)}
							className="border-[0.25px] border-slate-300 data-[state=checked]:border-green data-[state=checked]:bg-green data-[state=checked]:text-white"
						/>
						Include in the document
					</label>
				</div>
				<div className="flex shrink-0 items-center gap-2 self-center">
					<div
						{...attributes}
						{...listeners}
						className="cursor-grab rounded-md border border-slate-200 p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-50 hover:text-[#0f5384] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						title="Drag to reorder"
						aria-label="Drag to reorder"
					>
						<GripVertical className="h-4 w-4" />
					</div>
					{!section.required && (
						<>
							<div className="h-8 w-px bg-slate-200" aria-hidden />
							<button
								type="button"
								aria-label="Remove"
								className="cursor-pointer rounded-md border border-red/30 p-2 text-red transition-colors duration-200 hover:bg-red/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red/40"
								onClick={onRemove}
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</>
					)}
				</div>
			</div>
		</li>
	);
}
