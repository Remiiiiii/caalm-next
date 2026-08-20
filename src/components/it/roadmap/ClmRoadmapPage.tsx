"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Map } from "lucide-react";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { RoadmapProgressBar } from "@/components/it/roadmap/RoadmapProgressBar";
import { RoadmapTaskTree } from "@/components/it/roadmap/RoadmapTaskTree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type {
	RoadmapOverview,
	RoadmapTaskTreeNode,
} from "@/lib/roadmap/types";
import { fetcher } from "@/lib/swr-config";
import { cn } from "@/lib/utils";

type SectionTasksResponse = {
	sectionId: string;
	tasks: RoadmapTaskTreeNode[];
};

type TaskDetailResponse = {
	task: RoadmapTaskTreeNode;
	history: Array<{
		$id: string;
		fromStatus: string;
		toStatus: string;
		actor: string;
		commitSha: string | null;
		$createdAt: string;
	}>;
	latestTestRun: {
		result: string;
		summary: string;
		commitSha: string;
		logsUrl: string;
	} | null;
	prStatus: { state: string; htmlUrl?: string; title?: string } | null;
};

export function ClmRoadmapPage() {
	const { toast } = useToast();
	const { permissions } = usePermissions();
	const canManage = permissions.includes(PERMISSIONS.IT.MANAGE_ROADMAP);

	const {
		data: overview,
		error: overviewError,
		isLoading: overviewLoading,
		mutate: mutateOverview,
	} = useSWR<RoadmapOverview>("/api/roadmap/overview", fetcher, {
		refreshInterval: 15000,
	});

	const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
		null,
	);
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [branchName, setBranchName] = useState("");
	const [prUrl, setPrUrl] = useState("");
	const [prNumber, setPrNumber] = useState("");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!overview?.sections?.length) return;
		if (selectedSectionId) return;
		const firstOpen =
			overview.sections.find((s) => s.status !== "locked") ||
			overview.sections[0];
		setSelectedSectionId(firstOpen?.id || null);
	}, [overview, selectedSectionId]);

	const {
		data: sectionTasks,
		mutate: mutateTasks,
		isLoading: tasksLoading,
	} = useSWR<SectionTasksResponse>(
		selectedSectionId
			? `/api/roadmap/sections/${selectedSectionId}/tasks`
			: null,
		fetcher,
		{ refreshInterval: 15000 },
	);

	const { data: taskDetail, mutate: mutateDetail } = useSWR<TaskDetailResponse>(
		selectedTaskId ? `/api/roadmap/tasks/${selectedTaskId}` : null,
		fetcher,
	);

	const selectedSection = useMemo(
		() => overview?.sections.find((s) => s.id === selectedSectionId) || null,
		[overview, selectedSectionId],
	);

	const beginTask = useCallback(
		async (task: RoadmapTaskTreeNode) => {
			if (!canManage) return;
			const suggested = `clm/${task.taskCode.split(".")[0]}-${task.taskCode}-${task.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "")
				.slice(0, 40)}`;
			setSelectedTaskId(task.$id);
			setBranchName(suggested);
		},
		[canManage],
	);

	const submitStart = async () => {
		if (!selectedTaskId || !branchName.trim()) return;
		setBusy(true);
		try {
			const res = await fetch(
				`/api/roadmap/tasks/${selectedTaskId}/start`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ branchName: branchName.trim() }),
				},
			);
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Start failed");
			toast({ title: "Task started", description: branchName.trim() });
			await Promise.all([mutateOverview(), mutateTasks(), mutateDetail()]);
		} catch (error) {
			toast({
				title: "Could not start task",
				description: error instanceof Error ? error.message : "Unknown error",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	};

	const submitPrLink = async () => {
		if (!selectedTaskId || !prUrl.trim() || !prNumber.trim()) return;
		setBusy(true);
		try {
			const res = await fetch(
				`/api/roadmap/tasks/${selectedTaskId}/pr-linked`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						prUrl: prUrl.trim(),
						prNumber: Number(prNumber),
					}),
				},
			);
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "PR link failed");
			toast({ title: "PR linked", description: `PR #${prNumber}` });
			await Promise.all([mutateOverview(), mutateTasks(), mutateDetail()]);
		} catch (error) {
			toast({
				title: "Could not link PR",
				description: error instanceof Error ? error.message : "Unknown error",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<ITPageShell
			title="CLM Completion Roadmap"
			subtitle="Interactive plan engine — status flips only via verified merge + green tests, never by checkbox."
			icon={Map}
		>
			{overviewLoading ? (
				<ITGlassPanel>
					<p className="text-sm text-slate-600">Loading roadmap…</p>
				</ITGlassPanel>
			) : overviewError ? (
				<ITGlassPanel>
					<p className="text-sm text-slate-700">
						Could not load roadmap. Check IT roadmap permissions.
					</p>
				</ITGlassPanel>
			) : overview ? (
				<div className="space-y-6">
					<ITGlassPanel>
						<RoadmapProgressBar
							percent={overview.overallProgressPercent}
							label="Overall CLM buildout"
							size="md"
						/>
						<p className="text-xs text-slate-500 mt-2">
							Progress = complete tasks ÷ total tasks (derived, not stored).
						</p>
					</ITGlassPanel>

					<div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
						<div className="xl:col-span-4 space-y-3">
							{overview.sections.map((section) => {
								const locked = section.status === "locked";
								return (
									<button
										key={section.id}
										type="button"
										disabled={locked}
										onClick={() => {
											if (locked) return;
											setSelectedSectionId(section.id);
											setSelectedTaskId(null);
										}}
										className={cn(
											"w-full text-left rounded-lg border p-3 transition-all duration-200",
											locked
												? "border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed opacity-70"
												: "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer",
											selectedSectionId === section.id && !locked
												? "border-blue-300 ring-2 ring-[#0f5384]/20"
												: "",
										)}
									>
										<div className="flex items-center justify-between gap-2 mb-2">
											<span className="text-sm font-semibold text-slate-700">
												{section.sectionNumber}. {section.title}
											</span>
											<span className="text-[10px] uppercase text-slate-500">
												{section.status.replace("_", " ")}
											</span>
										</div>
										<RoadmapProgressBar
											percent={section.progressPercent}
											size="sm"
										/>
										<p className="text-xs text-slate-500 mt-1">
											{section.taskCounts.complete}/{section.taskCounts.total}{" "}
											complete
										</p>
									</button>
								);
							})}
						</div>

						<div className="xl:col-span-5">
							<ITGlassPanel>
								<h2 className="text-sm font-semibold sidebar-gradient-text mb-3">
									{selectedSection
										? `${selectedSection.sectionNumber}. ${selectedSection.title}`
										: "Tasks"}
								</h2>
								{tasksLoading ? (
									<p className="text-sm text-slate-600">Loading tasks…</p>
								) : (
									<RoadmapTaskTree
										tasks={sectionTasks?.tasks || []}
										selectedTaskId={selectedTaskId}
										onSelectTask={(t) => setSelectedTaskId(t.$id)}
										canManage={canManage}
										onBeginTask={beginTask}
									/>
								)}
							</ITGlassPanel>
						</div>

						<div className="xl:col-span-3">
							<ITGlassPanel>
								<h2 className="text-sm font-semibold sidebar-gradient-text mb-3">
									Task detail
								</h2>
								{!taskDetail ? (
									<p className="text-sm text-slate-600">
										Select a task to see acceptance criteria, PR binding, and
										status history.
									</p>
								) : (
									<div className="space-y-4 text-sm text-slate-700">
										<div>
											<p className="text-xs font-mono text-slate-500">
												{taskDetail.task.taskCode}
											</p>
											<p className="font-semibold">{taskDetail.task.title}</p>
											<p className="text-slate-600 mt-1">
												{taskDetail.task.description}
											</p>
										</div>

										<div>
											<p className="text-xs font-medium text-slate-500 mb-1">
												Acceptance criteria
											</p>
											<ul className="list-disc pl-4 space-y-1 text-slate-600">
												{(taskDetail.task.acceptanceCriteria || []).map(
													(c) => (
														<li key={c}>{c}</li>
													),
												)}
											</ul>
										</div>

										{taskDetail.prStatus ? (
											<p className="text-xs text-slate-600">
												PR status:{" "}
												<span className="font-medium">
													{taskDetail.prStatus.state}
												</span>
												{taskDetail.prStatus.htmlUrl ? (
													<>
														{" "}
														·{" "}
														<a
															href={taskDetail.prStatus.htmlUrl}
															className="text-[#0f5384] underline"
															target="_blank"
															rel="noreferrer"
														>
															open
														</a>
													</>
												) : null}
											</p>
										) : null}

										{taskDetail.latestTestRun ? (
											<p className="text-xs text-slate-600">
												Latest tests:{" "}
												<span className="font-medium">
													{taskDetail.latestTestRun.result}
												</span>{" "}
												— {taskDetail.latestTestRun.summary}
											</p>
										) : null}

										{canManage && taskDetail.task.status === "available" ? (
											<div className="space-y-2 border-t border-slate-200 pt-3">
												<p className="text-xs font-medium text-slate-500">
													Begin work
												</p>
												<Input
													value={branchName}
													onChange={(e) => setBranchName(e.target.value)}
													placeholder="clm/0-0.1-data-model"
													className="bg-white"
												/>
												<Button
													className="primary-btn w-full"
													disabled={busy || !branchName.trim()}
													onClick={submitStart}
												>
													Start task
												</Button>
											</div>
										) : null}

										{canManage &&
										(taskDetail.task.status === "in_progress" ||
											taskDetail.task.status === "in_review") ? (
											<div className="space-y-2 border-t border-slate-200 pt-3">
												<p className="text-xs font-medium text-slate-500">
													Link pull request
												</p>
												<Input
													value={prUrl}
													onChange={(e) => setPrUrl(e.target.value)}
													placeholder="https://github.com/org/repo/pull/123"
													className="bg-white"
												/>
												<Input
													value={prNumber}
													onChange={(e) => setPrNumber(e.target.value)}
													placeholder="PR number"
													className="bg-white"
												/>
												<Button
													className="primary-btn w-full"
													disabled={busy || !prUrl.trim() || !prNumber.trim()}
													onClick={submitPrLink}
												>
													Link PR
												</Button>
											</div>
										) : null}

										<div className="border-t border-slate-200 pt-3">
											<p className="text-xs font-medium text-slate-500 mb-2">
												Status history
											</p>
											<div className="space-y-2 max-h-48 overflow-y-auto">
												{(taskDetail.history || []).length === 0 ? (
													<p className="text-xs text-slate-500">No events yet</p>
												) : (
													taskDetail.history.map((h) => (
														<div
															key={h.$id}
															className="text-xs text-slate-600 border border-slate-200 rounded p-2 bg-white"
														>
															<p>
																{h.fromStatus} → {h.toStatus}
															</p>
															<p className="text-slate-500">
																{h.actor} ·{" "}
																{new Date(h.$createdAt).toLocaleString()}
															</p>
														</div>
													))
												)}
											</div>
										</div>

										<p className="text-[11px] text-slate-500">
											There is no Complete checkbox. Status becomes complete only
											when the merge webhook verifies tests on the merge commit.
										</p>
									</div>
								)}
							</ITGlassPanel>
						</div>
					</div>
				</div>
			) : null}
		</ITPageShell>
	);
}
