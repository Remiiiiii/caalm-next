"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
	AlertTriangle,
	Bot,
	FileQuestion,
	GripVertical,
	History,
	Info,
	Loader2,
	Plus,
	Save,
	X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { fadeIn } from "@/components/landing/motion";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
	CAALM_BADGE_BASE,
	normalizeSourceTag,
	type QuestionSourceTag,
	SECTION_INFO,
	SECTION_LABELS,
	SOURCE_TAG_BADGE,
	SOURCE_TAG_LABEL,
} from "@/lib/audit-lab/interview-builder-ui";
import {
	DEFAULT_SECTION_BUDGET_MINUTES,
	parseScriptDocument,
	SCRIPT_SECTIONS,
	type ScriptDocument,
	type ScriptItem,
	type ScriptSection,
	sectionMinutes,
	serializeScriptDocument,
} from "@/lib/audit-lab/script-sections";
import type { ReviewQuestion, ReviewScript } from "@/lib/audit-lab/types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { cn, resolveAvatarDisplayUrl } from "@/lib/utils";

const BANK_FILTERS = [
	{ value: "all", label: "All" },
	{ value: "finding", label: "Findings" },
	{ value: "readiness_gap", label: "Readiness gaps" },
	{ value: "template", label: "Templates" },
] as const;
type BankFilterValue = (typeof BANK_FILTERS)[number]["value"];

function aiBannerSignature(questions: ReviewQuestion[]): string {
	const findingCount = questions.filter((q) => q.source === "finding").length;
	const gapCount = questions.filter((q) => q.source === "readiness_gap").length;
	return `${findingCount}:${gapCount}:${questions.length}`;
}

function relativeSeconds(since: Date | null): string {
	if (!since) return "";
	const seconds = Math.max(
		0,
		Math.floor((Date.now() - since.getTime()) / 1000),
	);
	return `${seconds}s ago`;
}

export function InterviewScriptCanvas({
	sessionId,
	questions,
	initialItemsJson,
	initialVersion,
	initialAiBannerDismissedSignature,
	canEdit,
	isLoadingBank,
	onDismissAiBanner,
	onQuestionsChanged,
}: {
	sessionId: string;
	questions: ReviewQuestion[];
	initialItemsJson?: string;
	initialVersion: number;
	initialAiBannerDismissedSignature?: string;
	canEdit: boolean;
	isLoadingBank?: boolean;
	onDismissAiBanner?: (signature: string) => void;
	onQuestionsChanged?: () => void;
}) {
	const { toast } = useToast();
	const [doc, setDoc] = useState<ScriptDocument>(() =>
		parseScriptDocument(initialItemsJson),
	);
	const [version, setVersion] = useState(initialVersion);
	const [busy, setBusy] = useState(false);
	const [savingTemplate, setSavingTemplate] = useState(false);
	const [activeDrag, setActiveDrag] = useState<
		| { type: "bank"; question: ReviewQuestion }
		| { type: "item"; item: ScriptItem }
		| null
	>(null);
	const [conflict, setConflict] = useState(false);
	const [dirty, setDirty] = useState(false);
	const [autosaveError, setAutosaveError] = useState(false);
	const [editors, setEditors] = useState<
		Array<{ userId: string; name?: string; at: string }>
	>([]);
	/** Real profile photo per editor, when they have one uploaded — falls back to initials. */
	const [editorAvatars, setEditorAvatars] = useState<
		Map<string, string | null>
	>(new Map());
	const [bankFilter, setBankFilter] = useState<BankFilterValue>("all");
	/** Soft, local-only dismissal — never touches the database, no confirm needed. */
	const [dismissedBankIds, setDismissedBankIds] = useState<Set<string>>(
		new Set(),
	);
	function dismissFromBank(questionId: string) {
		setDismissedBankIds((prev) => new Set(prev).add(questionId));
	}
	const [newQuestionPrompt, setNewQuestionPrompt] = useState("");
	const [newQuestionSource, setNewQuestionSource] =
		useState<QuestionSourceTag>("template");
	const [addingQuestion, setAddingQuestion] = useState(false);

	async function submitNewQuestion() {
		const trimmed = newQuestionPrompt.trim();
		if (!trimmed) return;
		setAddingQuestion(true);
		try {
			const res = await fetch("/api/audit-lab/interview", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "add",
					sessionId,
					prompt: trimmed,
					source: newQuestionSource,
				}),
			});
			const json = (await res.json()) as { error?: string };
			if (!res.ok) throw new Error(json.error || "Could not add question.");
			setNewQuestionPrompt("");
			onQuestionsChanged?.();
		} catch (err) {
			toast({
				title: "Add question",
				description: toUserFacingErrorMessage(err, "Could not add question."),
				variant: "destructive",
			});
		} finally {
			setAddingQuestion(false);
		}
	}

	const [generatingFromGaps, setGeneratingFromGaps] = useState(false);
	async function generateFromGaps() {
		setGeneratingFromGaps(true);
		try {
			const res = await fetch("/api/audit-lab/interview", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "generate_from_gaps", sessionId }),
			});
			const json = (await res.json()) as {
				error?: string;
				data?: { questions?: unknown[] };
			};
			if (!res.ok)
				throw new Error(json.error || "Could not generate questions.");
			const count = json.data?.questions?.length ?? 0;
			toast({
				title: "Readiness gaps",
				description:
					count > 0
						? `Added ${count} question${count === 1 ? "" : "s"} from open readiness gaps.`
						: "No new open readiness gaps to turn into questions.",
			});
			onQuestionsChanged?.();
		} catch (err) {
			toast({
				title: "Readiness gaps",
				description: toUserFacingErrorMessage(
					err,
					"Could not generate questions from readiness gaps.",
				),
				variant: "destructive",
			});
		} finally {
			setGeneratingFromGaps(false);
		}
	}
	const [editingTimeboxId, setEditingTimeboxId] = useState<string | null>(null);
	const [editingBudget, setEditingBudget] = useState<ScriptSection | null>(
		null,
	);
	const [versionsOpen, setVersionsOpen] = useState(false);
	const [versions, setVersions] = useState<ReviewScript[] | null>(null);
	const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
	const [dismissedSignature, setDismissedSignature] = useState(
		initialAiBannerDismissedSignature,
	);

	const signature = useMemo(() => aiBannerSignature(questions), [questions]);
	const bannerDismissed = dismissedSignature === signature;
	const findingCount = questions.filter((q) => q.source === "finding").length;
	const gapCount = questions.filter((q) => q.source === "readiness_gap").length;

	useEffect(() => {
		if (!canEdit) return;
		const tick = () => {
			void fetch(`/api/audit-lab/scripts/${sessionId}/presence`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			})
				.then((r) => r.json())
				.then((json) => {
					if (Array.isArray(json?.data?.editors)) {
						setEditors(json.data.editors);
					}
				})
				.catch(() => undefined);
		};
		tick();
		const id = setInterval(tick, 15_000);
		return () => clearInterval(id);
	}, [sessionId, canEdit]);

	useEffect(() => {
		const missing = editors
			.map((e) => e.userId)
			.filter((userId) => userId && !editorAvatars.has(userId));
		if (missing.length === 0) return;
		void fetch("/api/users/get-by-ids", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userIds: missing }),
		})
			.then((r) => r.json())
			.then(
				(
					users: Array<{
						$id?: string;
						accountId?: string;
						avatar?: string | null;
						profileImageId?: string | null;
					}>,
				) => {
					if (!Array.isArray(users)) return;
					setEditorAvatars((prev) => {
						const next = new Map(prev);
						for (const user of users) {
							const url = resolveAvatarDisplayUrl(user);
							if (user.$id) next.set(user.$id, url);
							if (user.accountId) next.set(user.accountId, url);
						}
						// Anyone the lookup didn't return still shouldn't be re-fetched forever.
						for (const userId of missing) {
							if (!next.has(userId)) next.set(userId, null);
						}
						return next;
					});
				},
			)
			.catch(() => undefined);
	}, [editors, editorAvatars]);

	/**
	 * A 409 almost always means our own autosave and manual-save overlapped (same
	 * tab, same user) rather than a real second editor — so retry once with the
	 * server's reported version before bothering the user with a conflict banner.
	 */
	async function persist(
		next: ScriptDocument,
		expectedVersion: number,
		attempt = 0,
	): Promise<void> {
		const res = await fetch(`/api/audit-lab/scripts/${sessionId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				itemsJson: serializeScriptDocument(next),
				expectedVersion,
			}),
		});
		const json = (await res.json()) as {
			error?: string;
			conflict?: boolean;
			currentVersion?: number;
			data?: { version: number; itemsJson: string };
		};
		if (res.status === 409) {
			if (attempt === 0 && typeof json.currentVersion === "number") {
				return persist(next, json.currentVersion, attempt + 1);
			}
			setConflict(true);
			if (typeof json.currentVersion === "number")
				setVersion(json.currentVersion);
			throw new Error("conflict");
		}
		if (!res.ok) throw new Error(json.error || "Save failed");
		if (json.data) {
			setVersion(json.data.version);
			setDoc(parseScriptDocument(json.data.itemsJson));
		}
	}

	async function reloadLatestVersion() {
		try {
			const res = await fetch(`/api/audit-lab/scripts/${sessionId}`);
			const json = (await res.json()) as {
				data?: { versions: ReviewScript[] };
			};
			const latest = json.data?.versions?.[0];
			if (latest) {
				setVersion(latest.version);
				setDoc(parseScriptDocument(latest.itemsJson));
			}
			setConflict(false);
			setDirty(false);
		} catch {
			/* best effort */
		}
	}

	const { lastSaved, isSaving } = useAutoSave(
		doc as unknown as Record<string, unknown>,
		sessionId,
		dirty && canEdit,
		async (data) => {
			try {
				await persist(data as unknown as ScriptDocument, version);
				setDirty(false);
				setAutosaveError(false);
			} catch (err) {
				// A conflict already shows its own banner via `persist`; only a
				// genuine save failure should surface the "couldn't save" pill.
				if ((err as Error).message === "conflict") return;
				setAutosaveError(true);
				throw err;
			}
		},
		{
			debounceMs: 4000,
			localStorageKey: `interview-script-draft-${sessionId}`,
		},
	);

	async function manualSave() {
		setBusy(true);
		setConflict(false);
		try {
			await persist(doc, version);
			setDirty(false);
			setAutosaveError(false);
			toast({ title: "Script saved", description: `Version ${version + 1}` });
		} catch (err) {
			if ((err as Error).message === "conflict") {
				toast({
					title: "Script conflict",
					description:
						"Someone else saved first. Refresh their version or keep editing and save again.",
					variant: "destructive",
				});
				return;
			}
			toast({
				title: "Script",
				description: toUserFacingErrorMessage(err, "Could not save script."),
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	}

	async function saveAsTemplate() {
		const prompts = SCRIPT_SECTIONS.flatMap((section) =>
			doc.sections[section].map((item) => item.prompt),
		);
		if (prompts.length === 0) {
			toast({
				title: "Save as template",
				description: "Add questions to the script before saving a template.",
				variant: "destructive",
			});
			return;
		}
		setSavingTemplate(true);
		try {
			const res = await fetch("/api/audit-lab/interview", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "save_as_template",
					sessionId,
					prompts,
				}),
			});
			const json = (await res.json()) as {
				error?: string;
				data?: { questions?: unknown[] };
			};
			if (!res.ok) throw new Error(json.error || "Could not save template.");
			const createdCount = json.data?.questions?.length ?? 0;
			toast({
				title: "Saved as template",
				description:
					createdCount > 0
						? `${createdCount} question${createdCount === 1 ? "" : "s"} added to the Templates filter.`
						: "Those questions are already saved as templates.",
			});
			onQuestionsChanged?.();
		} catch (err) {
			toast({
				title: "Save as template",
				description: toUserFacingErrorMessage(err, "Could not save template."),
				variant: "destructive",
			});
		} finally {
			setSavingTemplate(false);
		}
	}

	function mutateDoc(mutator: (next: ScriptDocument) => ScriptDocument) {
		setDoc((prev) => mutator(structuredClone(prev)));
		setDirty(true);
	}

	function addToSection(section: ScriptSection, question: ReviewQuestion) {
		mutateDoc((next) => {
			next.sections[section].push({
				id: `${section}-${question.$id}-${Date.now()}`,
				questionId: question.$id,
				prompt: question.prompt,
				minutes: 5,
				section,
			});
			return next;
		});
	}

	function moveItem(
		itemId: string,
		toSection: ScriptSection,
		toIndex?: number,
	) {
		mutateDoc((next) => {
			let moved: ScriptItem | undefined;
			let fromSection: ScriptSection | undefined;
			for (const section of SCRIPT_SECTIONS) {
				const idx = next.sections[section].findIndex((i) => i.id === itemId);
				if (idx >= 0) {
					[moved] = next.sections[section].splice(idx, 1);
					fromSection = section;
					break;
				}
			}
			if (!moved) return next;
			moved.section = toSection;
			const list = next.sections[toSection];
			const insertAt =
				toIndex == null || toIndex > list.length ? list.length : toIndex;
			list.splice(insertAt, 0, moved);
			if (fromSection === toSection && toIndex == null) {
				// no-op reorder without a target index; keep as appended move
			}
			return next;
		});
	}

	/** Dragging an item back onto the bank sends it home — it reappears in the bank list. */
	function removeItem(itemId: string) {
		mutateDoc((next) => {
			for (const section of SCRIPT_SECTIONS) {
				const idx = next.sections[section].findIndex((i) => i.id === itemId);
				if (idx >= 0) {
					next.sections[section].splice(idx, 1);
					break;
				}
			}
			return next;
		});
	}

	function setTimebox(section: ScriptSection, itemId: string, minutes: number) {
		mutateDoc((next) => {
			const item = next.sections[section].find((i) => i.id === itemId);
			if (item) item.minutes = Math.max(0, Math.round(minutes));
			return next;
		});
	}

	function setBudget(section: ScriptSection, minutes: number) {
		mutateDoc((next) => {
			next.budgets[section] = Math.max(0, Math.round(minutes));
			return next;
		});
	}

	async function dismissBanner() {
		setDismissedSignature(signature);
		onDismissAiBanner?.(signature);
		try {
			await fetch(`/api/audit-lab/sessions/${sessionId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "dismiss_ai_banner", signature }),
			});
		} catch {
			/* best effort */
		}
	}

	async function openVersionHistory() {
		setVersionsOpen(true);
		try {
			const res = await fetch(`/api/audit-lab/scripts/${sessionId}`);
			const json = (await res.json()) as {
				data?: { versions: ReviewScript[] };
			};
			setVersions(json.data?.versions ?? []);
		} catch {
			setVersions([]);
		}
	}

	async function restoreVersion(targetVersion: number) {
		setRestoringVersion(targetVersion);
		try {
			const res = await fetch(`/api/audit-lab/scripts/${sessionId}/restore`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ version: targetVersion }),
			});
			const json = (await res.json()) as {
				error?: string;
				data?: { version: number; itemsJson: string };
			};
			if (!res.ok || !json.data)
				throw new Error(json.error || "Restore failed");
			setVersion(json.data.version);
			setDoc(parseScriptDocument(json.data.itemsJson));
			setVersionsOpen(false);
			toast({
				title: "Version restored",
				description: `Now at version ${json.data.version}`,
			});
		} catch (err) {
			toast({
				title: "Version history",
				description: toUserFacingErrorMessage(
					err,
					"Could not restore that version.",
				),
				variant: "destructive",
			});
		} finally {
			setRestoringVersion(null);
		}
	}

	/** A question that's already placed in the script leaves the bank — drag it back to re-add it. */
	const placedQuestionIds = useMemo(() => {
		const ids = new Set<string>();
		for (const section of SCRIPT_SECTIONS) {
			for (const item of doc.sections[section]) ids.add(item.questionId);
		}
		return ids;
	}, [doc]);

	/** Belt-and-suspenders: collapse any duplicate prompts even if the backend ever produced one. */
	const uniqueQuestions = useMemo(() => {
		const seen = new Set<string>();
		return questions.filter((q) => {
			const key = `${q.source}:${q.prompt.trim().toLowerCase()}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}, [questions]);

	const availableQuestions = useMemo(
		() =>
			uniqueQuestions.filter(
				(q) => !placedQuestionIds.has(q.$id) && !dismissedBankIds.has(q.$id),
			),
		[uniqueQuestions, placedQuestionIds, dismissedBankIds],
	);

	const filteredQuestions = useMemo(
		() =>
			bankFilter === "all"
				? availableQuestions
				: availableQuestions.filter(
						(q) => normalizeSourceTag(q.source) === bankFilter,
					),
		[availableQuestions, bankFilter],
	);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function handleDragStart(event: DragStartEvent) {
		const id = String(event.active.id);
		if (id.startsWith("bank:")) {
			const question = questions.find(
				(q) => q.$id === id.slice("bank:".length),
			);
			if (question) setActiveDrag({ type: "bank", question });
			return;
		}
		if (id.startsWith("item:")) {
			const itemId = id.slice("item:".length);
			for (const section of SCRIPT_SECTIONS) {
				const item = doc.sections[section].find((i) => i.id === itemId);
				if (item) {
					setActiveDrag({ type: "item", item });
					return;
				}
			}
		}
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveDrag(null);
		const { active, over } = event;
		if (!over) return;
		const activeId = String(active.id);
		const overId = String(over.id);

		if (activeId.startsWith("item:") && overId === "bank-panel") {
			removeItem(activeId.slice("item:".length));
			return;
		}

		if (activeId.startsWith("bank:")) {
			const questionId = activeId.slice("bank:".length);
			const question = questions.find((q) => q.$id === questionId);
			if (!question) return;
			let section: ScriptSection | undefined;
			let index: number | undefined;
			if (overId.startsWith("section:")) {
				section = overId.slice("section:".length) as ScriptSection;
			} else if (overId.startsWith("item:")) {
				section = over.data.current?.section as ScriptSection | undefined;
				const overItemId = overId.slice("item:".length);
				index = doc.sections[section as ScriptSection]?.findIndex(
					(i) => i.id === overItemId,
				);
			}
			if (!section) return;
			mutateDoc((next) => {
				const newItem: ScriptItem = {
					id: `${section}-${question.$id}-${Date.now()}`,
					questionId: question.$id,
					prompt: question.prompt,
					minutes: 5,
					section,
				};
				const list = next.sections[section as ScriptSection];
				const insertAt = index == null || index < 0 ? list.length : index;
				list.splice(insertAt, 0, newItem);
				return next;
			});
			return;
		}

		if (activeId.startsWith("item:")) {
			const itemId = activeId.slice("item:".length);
			let toSection: ScriptSection | undefined;
			let toIndex: number | undefined;
			if (overId.startsWith("section:")) {
				toSection = overId.slice("section:".length) as ScriptSection;
			} else if (overId.startsWith("item:")) {
				toSection = over.data.current?.section as ScriptSection | undefined;
				const overItemId = overId.slice("item:".length);
				toIndex = doc.sections[toSection as ScriptSection]?.findIndex(
					(i) => i.id === overItemId,
				);
			}
			if (!toSection || activeId === overId) return;
			moveItem(itemId, toSection, toIndex);
		}
	}

	const activeEditorCount = editors.length;
	const visibleEditors = editors.slice(0, 2);
	const hiddenEditorCount = Math.max(
		0,
		activeEditorCount - visibleEditors.length,
	);

	return (
		<motion.div
			className="space-y-3"
			variants={fadeIn}
			initial="hidden"
			animate="visible"
		>
			{/* AI prioritization banner — untethered, floats above the card */}
			{!bannerDismissed && (findingCount > 0 || gapCount > 0) ? (
				<div className="flex items-start gap-2.5 rounded-xl border border-blue/20 bg-blue/10 px-4 py-2.5 text-xs">
					<Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" aria-hidden />
					<p className="text-slate-700">
						<span className="font-bold">AI prioritization:</span> suggests
						starting with {findingCount} finding-based and {gapCount} gap-based
						question{findingCount + gapCount === 1 ? "" : "s"} out of{" "}
						{questions.length} in the bank.
					</p>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label="What do finding-based and gap-based mean?"
									className="shrink-0 text-blue/70 hover:text-blue"
								>
									<Info className="h-3.5 w-3.5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="max-w-xs text-xs">
								<p className="mb-1.5">
									<span className="font-semibold">Finding-based</span> —
									something a real auditor already flagged last time. These let
									you practice answering it again before it comes up for real.
								</p>
								<p>
									<span className="font-semibold">Gap-based</span> — a weak spot
									your own team already knows about internally. Practicing these
									helps you shore it up before an outside auditor ever sees it.
								</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<button
						type="button"
						className="ml-auto shrink-0 text-slate-400 hover:text-slate-600"
						aria-label="Dismiss AI prioritization suggestion"
						onClick={() => void dismissBanner()}
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			) : null}

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-0">
					{conflict ? (
						<div className="flex items-center gap-2 border-b border-red/20 bg-red/10 px-4 py-2 text-sm text-red">
							Someone else saved a newer version. Reload it, then redo your
							changes.
							<button
								type="button"
								className="ml-2 underline"
								onClick={() => void reloadLatestVersion()}
							>
								Reload latest version
							</button>
						</div>
					) : null}

					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
						onDragCancel={() => setActiveDrag(null)}
					>
						<div className="grid grid-cols-1 lg:h-[560px] lg:grid-cols-[520px_minmax(0,1fr)]">
							{/* Question bank panel */}
							<div className="flex min-h-0 flex-col gap-2.5 border-slate-200 p-3.5 lg:border-r">
								<p className="text-xs font-bold uppercase tracking-wide text-slate-700">
									Question bank
								</p>
								<SegmentedToggle
									value={bankFilter}
									onChange={setBankFilter}
									ariaLabel="Filter the question bank"
									className="segmented-toggle-sm"
									tabs={BANK_FILTERS.map((f) => ({
										value: f.value,
										label: f.label,
									}))}
								/>
								{canEdit ? (
									<div className="space-y-1.5">
										<div className="flex items-center gap-1.5">
											<input
												type="text"
												value={newQuestionPrompt}
												onChange={(e) => setNewQuestionPrompt(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") void submitNewQuestion();
												}}
												placeholder="Add your own question…"
												className="min-w-0 flex-1 rounded-md border border-slate-200 px-2.5 py-2 text-[11.5px]"
											/>
											<button
												type="button"
												disabled={addingQuestion || !newQuestionPrompt.trim()}
												onClick={() => void submitNewQuestion()}
												className="shrink-0 rounded-md bg-[#0f5384] p-1.5 text-white disabled:opacity-40"
												aria-label={
													addingQuestion ? "Adding question…" : "Add question"
												}
											>
												{addingQuestion ? (
													<Loader2 className="h-3 w-3 animate-spin" />
												) : (
													<Plus className="h-3 w-3" />
												)}
											</button>
										</div>
										<div className="flex flex-wrap gap-1">
											{(
												[
													{ value: "template", label: "Template" },
													{ value: "finding", label: "Finding" },
													{ value: "readiness_gap", label: "Readiness gap" },
												] as const
											).map((opt) => (
												<button
													key={opt.value}
													type="button"
													onClick={() => setNewQuestionSource(opt.value)}
													className={cn(
														"rounded-full border px-2 py-0.5 text-[10px] font-semibold",
														newQuestionSource === opt.value
															? "border-transparent bg-[#0f5384] text-white"
															: "border-slate-200 bg-white text-slate-500",
													)}
												>
													{opt.label}
												</button>
											))}
										</div>
									</div>
								) : null}
								<div className="border-t border-slate-200" />
								<BankDropZone>
									<div className="min-h-0 max-h-[460px] flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-2 pt-2 lg:max-h-none">
										{isLoadingBank ? (
											<>
												<Skeleton className="h-16 w-full rounded-lg" />
												<Skeleton className="h-16 w-full rounded-lg" />
												<Skeleton className="h-16 w-full rounded-lg" />
											</>
										) : filteredQuestions.length === 0 ? (
											bankFilter === "readiness_gap" ? (
												<button
													type="button"
													disabled={!canEdit || generatingFromGaps}
													onClick={() => void generateFromGaps()}
													className={cn(
														"flex w-full flex-col items-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#078fab]/35 bg-[#078fab]/[.025] px-4 py-6 text-center transition-[border-color,background-color] duration-200",
														canEdit &&
															!generatingFromGaps &&
															"cursor-pointer hover:border-[#078fab]/60 hover:bg-[#078fab]/[.045]",
														(!canEdit || generatingFromGaps) &&
															"cursor-default opacity-70",
													)}
												>
													<div className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] border border-[#0f5384]/[.12] bg-[#0f5384]/[.06]">
														{generatingFromGaps ? (
															<Loader2
																className="h-5 w-5 animate-spin text-[#0f5384]/70"
																aria-hidden
															/>
														) : (
															<AlertTriangle
																className="h-5 w-5 text-[#0f5384]/70"
																aria-hidden
															/>
														)}
													</div>
													<p className="text-[13px] font-semibold text-slate-600">
														{generatingFromGaps ? (
															"Generating from gaps…"
														) : (
															<>
																<span className="text-[#078fab] underline">
																	Click here
																</span>{" "}
																to generate from readiness gaps
															</>
														)}
													</p>
													<p className="text-[11.5px] text-slate-400">
														Turns each open readiness gap into a practice
														question
													</p>
												</button>
											) : (
												<p className="text-sm text-slate-500">
													{questions.length === 0
														? "Generate questions first."
														: "Nothing in the bank matches this filter."}
												</p>
											)
										) : (
											filteredQuestions.map((q) => (
												<BankCard
													key={q.$id}
													question={q}
													canEdit={canEdit}
													onDismiss={() => dismissFromBank(q.$id)}
												/>
											))
										)}
									</div>
								</BankDropZone>
							</div>

							{/* Script canvas */}
							<div className="flex min-h-0 min-w-0 flex-col gap-3 p-3.5">
								<div className="flex min-w-0 shrink-0 items-center justify-between gap-3">
									<span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
										{autosaveError
											? "Couldn’t save — retrying"
											: isSaving
												? "Saving…"
												: lastSaved
													? `Autosaved ${relativeSeconds(lastSaved)}`
													: "Autosave on"}
									</span>
									<div className="flex min-w-0 shrink-0 items-center justify-end gap-3">
										{activeEditorCount > 0 ? (
											<div className="flex min-w-0 items-center gap-2">
												<div
													className="flex shrink-0 items-center"
													role="list"
													aria-label="Editing now"
												>
													{visibleEditors.map((e, i) => (
														<Avatar
															key={e.userId}
															userId={e.userId}
															name={e.name}
															imageUrl={editorAvatars.get(e.userId) ?? null}
															size="xs"
															className={cn("relative", i > 0 && "-ml-2")}
														/>
													))}
													{hiddenEditorCount > 0 ? (
														<span className="relative -ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-500 text-[9px] font-semibold text-white">
															+{hiddenEditorCount}
														</span>
													) : null}
												</div>
												<p className="truncate text-[11.5px] text-slate-500">
													{activeEditorCount >= 3
														? `${activeEditorCount} people editing`
														: `${editors.map((e) => e.name || e.userId.slice(0, 6)).join(" & ")} editing`}
												</p>
											</div>
										) : null}
										<button
											type="button"
											className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-slate-700"
											onClick={() => void openVersionHistory()}
										>
											<History className="h-3.5 w-3.5" aria-hidden />
											Version history
										</button>
									</div>
								</div>

								<div className="min-h-0 max-h-[460px] flex-1 space-y-3 overflow-y-auto pr-1 lg:max-h-none">
									{SCRIPT_SECTIONS.map((section) => (
										<ScriptSectionBox
											key={section}
											section={section}
											items={doc.sections[section]}
											budget={
												doc.budgets[section] ??
												DEFAULT_SECTION_BUDGET_MINUTES[section]
											}
											canEdit={canEdit}
											questions={questions}
											editingTimeboxId={editingTimeboxId}
											setEditingTimeboxId={setEditingTimeboxId}
											editingBudget={editingBudget === section}
											setEditingBudget={(editing) =>
												setEditingBudget(editing ? section : null)
											}
											onSetTimebox={(itemId, minutes) =>
												setTimebox(section, itemId, minutes)
											}
											onSetBudget={(minutes) => setBudget(section, minutes)}
											onAddFromBank={(question) =>
												addToSection(section, question)
											}
											onRemoveItem={(itemId) => removeItem(itemId)}
										/>
									))}
								</div>
							</div>
						</div>

						<DragOverlay>
							{activeDrag?.type === "bank" ? (
								<div className="flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg">
									<p className="min-w-0 flex-1 text-[11.5px] font-semibold leading-snug text-slate-700">
										"{activeDrag.question.prompt}"
									</p>
								</div>
							) : activeDrag?.type === "item" ? (
								<div className="flex items-center gap-2 rounded-[7px] border border-slate-200 bg-white px-2.5 py-2 shadow-lg">
									<GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300" />
									<p className="min-w-0 flex-1 truncate text-xs text-slate-700">
										{activeDrag.item.prompt}
									</p>
								</div>
							) : null}
						</DragOverlay>
					</DndContext>

					{canEdit ? (
						<div className="flex items-center justify-between gap-2.5 border-t border-slate-200 px-3.5 py-3">
							<div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
								<Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
								<span>
									<span className="font-semibold text-slate-600">
										Save script
									</span>{" "}
									checkpoints this version —{" "}
									<span className="font-semibold text-slate-600">
										Save as template
									</span>{" "}
									copies its questions to the bank for reuse.
								</span>
							</div>
							<div className="flex items-center gap-2.5">
								<Button
									type="button"
									className="btn-primary"
									disabled={busy}
									onClick={() => void manualSave()}
								>
									{busy ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
									) : (
										<Save className="h-3.5 w-3.5" aria-hidden />
									)}
									<span>
										{busy ? "Saving script…" : `Save script (v${version})`}
									</span>
								</Button>
								<Button
									type="button"
									className="btn-primary"
									disabled={savingTemplate}
									onClick={() => void saveAsTemplate()}
								>
									{savingTemplate ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
									) : (
										<Save className="h-3.5 w-3.5" aria-hidden />
									)}
									<span>
										{savingTemplate ? "Saving template…" : "Save as template"}
									</span>
								</Button>
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
				<DialogContent className="glass-card max-w-md">
					<DialogHeader>
						<DialogTitle>Version history</DialogTitle>
					</DialogHeader>
					<div className="max-h-96 space-y-2 overflow-y-auto">
						{versions == null ? (
							<Skeleton className="h-10 w-full" />
						) : versions.length === 0 ? (
							<p className="text-sm text-slate-500">No saved versions yet.</p>
						) : (
							versions.map((v) => (
								<div
									key={v.$id}
									className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									<div>
										<p className="font-semibold text-slate-700">
											Version {v.version}
										</p>
										<p className="text-xs text-slate-500">
											{v.$createdAt
												? new Date(v.$createdAt).toLocaleString()
												: ""}
										</p>
									</div>
									{canEdit ? (
										<Button
											type="button"
											variant="outline"
											className="h-8 text-xs"
											disabled={
												v.version === version || restoringVersion != null
											}
											onClick={() => void restoreVersion(v.version)}
										>
											{restoringVersion === v.version ? (
												<>
													<Loader2
														className="h-3 w-3 animate-spin"
														aria-hidden
													/>
													Restoring…
												</>
											) : (
												"Restore"
											)}
										</Button>
									) : null}
								</div>
							))
						)}
					</div>
				</DialogContent>
			</Dialog>
		</motion.div>
	);
}

/** Drop an already-placed item here to send it back to the bank. */
function BankDropZone({ children }: { children: ReactNode }) {
	const { setNodeRef, isOver } = useDroppable({ id: "bank-panel" });
	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex min-h-0 flex-1 flex-col rounded-lg transition-colors",
				isOver && "bg-[#078fab]/[.06] ring-1 ring-[#078fab]/40",
			)}
		>
			{children}
		</div>
	);
}

function BankCard({
	question,
	canEdit,
	onDismiss,
}: {
	question: ReviewQuestion;
	canEdit: boolean;
	onDismiss: () => void;
}) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: `bank:${question.$id}`,
		disabled: !canEdit,
	});
	const source = normalizeSourceTag(question.source);

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"group relative flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5",
				isDragging && "opacity-40",
			)}
		>
			{canEdit ? (
				<button
					type="button"
					aria-label="Remove from bank"
					onClick={onDismiss}
					className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-red/20 bg-red/10 text-red opacity-0 transition-opacity group-hover:opacity-100"
				>
					<X className="h-3 w-3" />
				</button>
			) : null}
			{canEdit ? (
				<button
					type="button"
					className="shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500"
					{...attributes}
					{...listeners}
					aria-label="Drag to add to a section"
				>
					<GripVertical className="h-3.5 w-3.5" />
				</button>
			) : null}
			<div className="min-w-0 flex-1">
				<p className="mb-1.5 text-[11.5px] font-semibold leading-snug text-slate-700">
					"{question.prompt}"
				</p>
				<div className="flex flex-wrap gap-1">
					<span className={cn(CAALM_BADGE_BASE, SOURCE_TAG_BADGE[source])}>
						{SOURCE_TAG_LABEL[source]}
					</span>
					{question.controlRef ? (
						<span
							className={cn(
								CAALM_BADGE_BASE,
								"bg-slate-100 text-slate-600 border-slate-200",
							)}
						>
							{question.controlRef}
						</span>
					) : null}
					<span
						className={cn(
							CAALM_BADGE_BASE,
							"bg-slate-100 text-slate-600 border-slate-200",
						)}
					>
						Diff.{" "}
						{question.difficulty === "high"
							? 4
							: question.difficulty === "medium"
								? 2
								: 1}
					</span>
				</div>
			</div>
		</div>
	);
}

function ScriptSectionBox({
	section,
	items,
	budget,
	canEdit,
	questions,
	editingTimeboxId,
	setEditingTimeboxId,
	editingBudget,
	setEditingBudget,
	onSetTimebox,
	onSetBudget,
	onAddFromBank,
	onRemoveItem,
}: {
	section: ScriptSection;
	items: ScriptItem[];
	budget: number;
	canEdit: boolean;
	questions: ReviewQuestion[];
	editingTimeboxId: string | null;
	setEditingTimeboxId: (id: string | null) => void;
	editingBudget: boolean;
	setEditingBudget: (editing: boolean) => void;
	onSetTimebox: (itemId: string, minutes: number) => void;
	onSetBudget: (minutes: number) => void;
	onAddFromBank: (question: ReviewQuestion) => void;
	onRemoveItem: (itemId: string) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: `section:${section}`,
		data: { type: "section", section },
	});
	const used = sectionMinutes(items);

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"min-h-[88px] min-w-0 rounded-lg border border-dashed p-2.5 transition-colors",
				isOver
					? "border-[#078fab] bg-[#078fab]/[.04]"
					: "border-slate-300 bg-slate-50/60",
			)}
		>
			<div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
				<div className="flex items-center gap-1">
					<span className="text-slate-700">{SECTION_LABELS[section]}</span>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label={`What goes in ${SECTION_LABELS[section]}?`}
									className="text-slate-400 hover:text-slate-600"
								>
									<Info className="h-3 w-3" />
								</button>
							</TooltipTrigger>
							<TooltipContent
								side="top"
								className="max-w-xs text-xs normal-case"
							>
								<p className="mb-1.5 font-normal text-slate-700">
									{SECTION_INFO[section].description}
								</p>
								<p className="font-normal text-slate-500">
									Example: {SECTION_INFO[section].example}
								</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				{editingBudget ? (
					<input
						type="number"
						ref={(el) => el?.focus()}
						defaultValue={budget}
						className="w-14 rounded border border-slate-300 px-1 py-0.5 text-right text-xs tabular-nums"
						onBlur={(e) => {
							onSetBudget(Number(e.target.value) || 0);
							setEditingBudget(false);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") e.currentTarget.blur();
						}}
					/>
				) : (
					<button
						type="button"
						className="font-bold tabular-nums"
						onClick={() => canEdit && setEditingBudget(true)}
					>
						{used} / {budget} min
					</button>
				)}
			</div>

			{items.length === 0 ? (
				<div className="flex flex-col items-center gap-1 px-2.5 py-4 text-center text-[11px] text-slate-400">
					<FileQuestion className="h-[18px] w-[18px]" aria-hidden />
					<p>
						Drag a question here, or{" "}
						{canEdit ? (
							<AddFromBankMenu questions={questions} onAdd={onAddFromBank} />
						) : null}
					</p>
				</div>
			) : (
				<SortableContext
					items={items.map((i) => `item:${i.id}`)}
					strategy={verticalListSortingStrategy}
				>
					<ul className="space-y-1.5">
						{items.map((item) => (
							<SortableScriptItem
								key={item.id}
								item={item}
								section={section}
								canEdit={canEdit}
								isEditingTimebox={editingTimeboxId === item.id}
								onStartEditTimebox={() => setEditingTimeboxId(item.id)}
								onCommitTimebox={(minutes) => {
									onSetTimebox(item.id, minutes);
									setEditingTimeboxId(null);
								}}
								onRemove={() => onRemoveItem(item.id)}
							/>
						))}
					</ul>
				</SortableContext>
			)}
		</div>
	);
}

function AddFromBankMenu({
	questions,
	onAdd,
}: {
	questions: ReviewQuestion[];
	onAdd: (question: ReviewQuestion) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="font-semibold text-[#0f5384] underline-offset-2 hover:underline">
				+ add one
			</DropdownMenuTrigger>
			<AppDropdownMenuContent
				align="center"
				className="max-h-72 overflow-y-auto"
			>
				{questions.length === 0 ? (
					<AppDropdownMenuItem
						icon={FileQuestion}
						disabled
						onSelect={() => undefined}
					>
						No questions in the bank
					</AppDropdownMenuItem>
				) : (
					questions.map((q) => (
						<AppDropdownMenuItem
							key={q.$id}
							icon={FileQuestion}
							onSelect={() => onAdd(q)}
						>
							{q.prompt.slice(0, 60)}
							{q.prompt.length > 60 ? "…" : ""}
						</AppDropdownMenuItem>
					))
				)}
			</AppDropdownMenuContent>
		</DropdownMenu>
	);
}

function SortableScriptItem({
	item,
	section,
	canEdit,
	isEditingTimebox,
	onStartEditTimebox,
	onCommitTimebox,
	onRemove,
}: {
	item: ScriptItem;
	section: ScriptSection;
	canEdit: boolean;
	isEditingTimebox: boolean;
	onStartEditTimebox: () => void;
	onCommitTimebox: (minutes: number) => void;
	onRemove: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: `item:${item.id}`, data: { type: "item", section } });
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<li
			ref={setNodeRef}
			style={style}
			className={cn(
				"group relative flex items-start gap-2 rounded-[7px] border border-slate-200 bg-white px-2.5 py-2",
				isDragging && "opacity-50 shadow-lg",
			)}
		>
			{canEdit ? (
				<button
					type="button"
					aria-label="Remove from script"
					onClick={onRemove}
					className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-red/20 bg-red/10 text-red opacity-0 transition-opacity group-hover:opacity-100"
				>
					<X className="h-3 w-3" />
				</button>
			) : null}
			{canEdit ? (
				<button
					type="button"
					className="shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500"
					{...attributes}
					{...listeners}
					aria-label="Drag to reorder or move"
				>
					<GripVertical className="h-3.5 w-3.5" />
				</button>
			) : null}
			<p className="min-w-0 flex-1 text-xs text-slate-700">{item.prompt}</p>
			{isEditingTimebox ? (
				<input
					type="number"
					ref={(el) => el?.focus()}
					defaultValue={item.minutes}
					className="w-12 shrink-0 rounded border border-slate-300 px-1 py-0.5 text-right text-[10px] tabular-nums"
					onBlur={(e) => onCommitTimebox(Number(e.target.value) || 0)}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur();
					}}
				/>
			) : (
				<button
					type="button"
					className="shrink-0 rounded-[6px] bg-slate-100 px-[7px] py-[3px] text-[10px] font-bold tabular-nums text-slate-600"
					onClick={() => canEdit && onStartEditTimebox()}
				>
					{item.minutes}m
				</button>
			)}
		</li>
	);
}
