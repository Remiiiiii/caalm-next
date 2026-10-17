"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { TaskInlineCreateRow } from "@/components/tasks/TaskInlineCreateRow";
import { TasksBulkBar } from "@/components/tasks/TasksBulkBar";
import { TasksDataTable } from "@/components/tasks/TasksDataTable";
import {
	type TaskListFilters,
	TasksFilterBar,
} from "@/components/tasks/TasksFilterBar";
import { TasksPageShell } from "@/components/tasks/TasksPageShell";
import { TasksViewTabs } from "@/components/tasks/TasksViewTabs";
import type { TaskPerson } from "@/components/tasks/task-ui";
import { Card as GlassCard, CardContent } from "@/components/ui/card";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { LoadingSpinner } from "@/components/ui/loading";
import { ToastAction } from "@/components/ui/toast";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { usePermissions } from "@/hooks/usePermissions";
import { fetcher } from "@/lib/swr-config";
import { cn, getProfilePictureUrl } from "@/lib/utils";
import type {
	TaskListItem,
	TaskPriority,
	TaskStatus,
	TaskView,
	TaskViewCounts,
} from "@/types/tasks";

/** Space under the card for the dock when the list is short enough to sit below it */
const BULK_DOCK_BELOW_GAP_PX = 8;
const BULK_DOCK_HEIGHT_PX = 52;

interface TasksResponse {
	success: boolean;
	data: { tasks: TaskListItem[] };
	meta?: { total: number; counts?: TaskViewCounts };
}

const EMPTY_COUNTS: TaskViewCounts = {
	all: 0,
	mine: 0,
	unassigned: 0,
	overdue: 0,
	dueThisWeek: 0,
};

export default function TeamTasksPage() {
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { orgId } = useOrganization();
	const timeZone = useOrgTimezone();
	const { toast } = useToast();

	const [creating, setCreating] = useState(false);
	const [view, setView] = useState<TaskView>("all");
	const [filters, setFilters] = useState<TaskListFilters>({
		search: "",
		status: "all",
		priority: "all",
		assigneeId: "",
		dueBucket: "any",
	});
	const [people, setPeople] = useState<TaskPerson[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [openTaskId, setOpenTaskId] = useState<string | null>(null);
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
	const [bulkDeleting, setBulkDeleting] = useState(false);
	const [bulkPlacement, setBulkPlacement] = useState<"below-card" | "sticky">(
		"below-card",
	);
	const cardRef = useRef<HTMLDivElement>(null);

	const canCreate = permissions.includes(PERMISSIONS.EVENTS.CREATE);
	const canAssign = permissions.includes(PERMISSIONS.EVENTS.INVITE);
	const canAccess =
		canCreate || canAssign || permissions.includes(PERMISSIONS.EVENTS.APPROVE);

	const query = useMemo(() => {
		const params = new URLSearchParams();
		if (filters.status !== "all") params.set("status", filters.status);
		if (filters.priority !== "all") params.set("priority", filters.priority);
		if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
		if (filters.search.trim()) params.set("search", filters.search.trim());
		params.set("view", view);
		params.set("dueBucket", filters.dueBucket);
		params.set("limit", "100");
		return `/api/tasks?${params.toString()}`;
	}, [filters, view]);

	const { data, error, isLoading, mutate } = useSWR<TasksResponse>(
		canAccess ? query : null,
		fetcher,
	);

	useEffect(() => {
		if (!orgId) return;
		const canLoadPeople =
			permissions.includes(PERMISSIONS.USERS.VIEW) ||
			permissions.includes(PERMISSIONS.CONTRACTS.VIEW) ||
			permissions.includes(PERMISSIONS.CALENDAR.CREATE);
		if (!canLoadPeople) return;

		fetch("/api/users/directory")
			.then((r) => (r.ok ? r.json() : []))
			.then(
				(
					users: Array<{
						$id?: string;
						fullName?: string;
						email?: string;
						department?: string;
						division?: string | null;
						avatar?: string | null;
					}>,
				) => {
					const list = (Array.isArray(users) ? users : []).map((u) => {
						const department = u.department || "Other";
						const division = u.division || null;
						const subtitle = [department, division].filter(Boolean).join(" · ");
						return {
							id: u.$id || "",
							name: u.fullName || u.email || "User",
							imageUrl: getProfilePictureUrl(u.avatar),
							subtitle: subtitle || null,
							department,
							division,
						};
					});
					setPeople(list.filter((a) => a.id));
				},
			)
			.catch(() => setPeople([]));
	}, [orgId, permissions]);

	const tasks = data?.data?.tasks || [];
	const counts = data?.meta?.counts || EMPTY_COUNTS;
	const openTask = tasks.find((t) => t.$id === openTaskId) || null;

	// Short list: dock sits a few px under the card. Tall list: fixed bottom dock + shadow.
	useEffect(() => {
		const el = cardRef.current;
		if (!el) return;

		const updatePlacement = () => {
			const rect = el.getBoundingClientRect();
			const roomNeeded =
				BULK_DOCK_BELOW_GAP_PX + BULK_DOCK_HEIGHT_PX + 16;
			const fitsBelow =
				rect.bottom + roomNeeded <= window.innerHeight &&
				rect.top >= 0;
			setBulkPlacement(fitsBelow ? "below-card" : "sticky");
		};

		updatePlacement();
		const ro = new ResizeObserver(updatePlacement);
		ro.observe(el);
		window.addEventListener("resize", updatePlacement);
		window.addEventListener("scroll", updatePlacement, { passive: true });
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", updatePlacement);
			window.removeEventListener("scroll", updatePlacement);
		};
	}, [tasks.length, isLoading, creating, view, filters]);

	const patchTask = useCallback(
		async (taskId: string, body: Record<string, unknown>) => {
			const previous = data;
			await mutate(
				(current) => {
					if (!current?.data?.tasks) return current;
					return {
						...current,
						data: {
							...current.data,
							tasks: current.data.tasks.map((task) =>
								task.$id === taskId ? { ...task, ...body } : task,
							),
						},
					};
				},
				{ revalidate: false },
			);
			try {
				const res = await fetch(`/api/tasks/${taskId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
				if (!res.ok) {
					await mutate(previous, { revalidate: false });
					toast({ title: "Could not update task", variant: "destructive" });
					return;
				}
				void mutate();
			} catch {
				await mutate(previous, { revalidate: false });
				toast({ title: "Could not update task", variant: "destructive" });
			}
		},
		[data, mutate, toast],
	);

	const showUndo = useCallback(
		(ids: string[]) => {
			toast({
				title: ids.length === 1 ? "Task deleted" : `${ids.length} tasks deleted`,
				action: (
					<ToastAction
						altText="Undo"
						onClick={() => {
							void (async () => {
								await Promise.all(
									ids.map((id) =>
										fetch(`/api/tasks/${id}/restore`, { method: "POST" }),
									),
								);
								void mutate();
							})();
						}}
					>
						Undo
					</ToastAction>
				),
			});
		},
		[mutate, toast],
	);

	const handleDelete = useCallback(
		async (taskId: string) => {
			const previous = data;
			await mutate(
				(current) => {
					if (!current?.data?.tasks) return current;
					return {
						...current,
						data: {
							...current.data,
							tasks: current.data.tasks.filter((t) => t.$id !== taskId),
						},
					};
				},
				{ revalidate: false },
			);
			const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
			if (!res.ok) {
				await mutate(previous, { revalidate: false });
				toast({ title: "Could not delete task", variant: "destructive" });
				return;
			}
			showUndo([taskId]);
			void mutate();
		},
		[data, mutate, showUndo, toast],
	);

	const handleCreate = useCallback(
		async (title: string) => {
			const res = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title }),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast({
					title: "Could not create task",
					description: body.error || "Try again",
					variant: "destructive",
				});
				throw new Error(body.error || "Create failed");
			}
			toast({ title: "Task created" });
			setCreating(false);
			await mutate();
		},
		[mutate, toast],
	);

	const handleDuplicate = useCallback(
		async (task: TaskListItem) => {
			const res = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: `${task.title} (copy)`,
					description: task.description,
					priority: task.priority,
					dueDate: task.dueDate,
					linkedEntityType: task.linkedEntityType,
					linkedEntityId: task.linkedEntityId,
				}),
			});
			if (!res.ok) {
				toast({ title: "Could not duplicate task", variant: "destructive" });
				return;
			}
			toast({ title: "Task duplicated" });
			await mutate();
		},
		[mutate, toast],
	);

	const handleBulk = useCallback(
		async (
			action: "assign" | "status" | "priority" | "delete",
			extra?: Record<string, unknown>,
		) => {
			const ids = [...selectedIds];
			if (ids.length === 0) return;
			const res = await fetch("/api/tasks/bulk", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids, action, ...extra }),
			});
			if (!res.ok) {
				toast({ title: "Bulk update failed", variant: "destructive" });
				return false;
			}
			if (action === "delete") showUndo(ids);
			setSelectedIds(new Set());
			await mutate();
			return true;
		},
		[mutate, selectedIds, showUndo, toast],
	);

	const confirmBulkDelete = useCallback(async () => {
		setBulkDeleting(true);
		try {
			await handleBulk("delete");
			setBulkDeleteOpen(false);
		} finally {
			setBulkDeleting(false);
		}
	}, [handleBulk]);

	if (permissionsLoading) {
		return (
			<div className="flex w-full justify-center px-4 py-12 sm:px-6 lg:px-8 xl:px-12">
				<LoadingSpinner size="sm" label="Loading tasks…" />
			</div>
		);
	}

	if (!canAccess) {
		return (
			<div className="w-full px-4 py-12 sm:px-6 lg:px-8 xl:px-12">
				<p className="text-slate-700">
					You need event create or invite permission to manage tasks.
				</p>
			</div>
		);
	}

	return (
		<TasksPageShell>
			<GlassCard
				ref={cardRef}
				className={cn(
					"glass-card overflow-hidden",
					bulkPlacement === "below-card" && selectedIds.size > 0
						? "mb-0"
						: "mb-6",
				)}
			>
				<div className="glass-card-cap" />
				<CardContent className="p-0">
					<TasksViewTabs value={view} counts={counts} onChange={setView} />
					<TasksFilterBar
						filters={filters}
						onChange={setFilters}
						people={people}
					/>
					{canCreate ? (
						<TaskInlineCreateRow
							open={creating}
							onOpen={() => setCreating(true)}
							onCancel={() => setCreating(false)}
							onSubmit={handleCreate}
							disabled={!canCreate}
						/>
					) : null}
					{isLoading ? (
						<div className="flex justify-center py-12">
							<LoadingSpinner size="sm" label="Loading…" />
						</div>
					) : error ? (
						<div className="py-12 text-center text-sm text-slate-600">
							Could not load tasks. Refresh and try again.
						</div>
					) : (
						<TasksDataTable
							tasks={tasks}
							people={people}
							selectedIds={selectedIds}
							timeZone={timeZone}
							canEdit={canCreate}
							canAssign={canAssign}
							onToggle={(id, checked) => {
								setSelectedIds((prev) => {
									const next = new Set(prev);
									if (checked) next.add(id);
									else next.delete(id);
									return next;
								});
							}}
							onToggleAll={(checked) => {
								setSelectedIds(
									checked ? new Set(tasks.map((t) => t.$id)) : new Set(),
								);
							}}
							onOpen={(task) => setOpenTaskId(task.$id)}
							onStatusChange={(id, status) => void patchTask(id, { status })}
							onPriorityChange={(id, priority) =>
								void patchTask(id, { priority })
							}
							onAssigneeChange={(id, assigneeId) =>
								void patchTask(id, { assigneeId })
							}
							onDueChange={(id, dueDate) =>
								void patchTask(id, { dueDate: dueDate || null })
							}
							onDuplicate={(task) => void handleDuplicate(task)}
							onDelete={(id) => void handleDelete(id)}
						/>
					)}
					<div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
						<span>
							Showing {tasks.length} of {data?.meta?.total ?? tasks.length} tasks
						</span>
						<span>Page 1 of 1</span>
					</div>
				</CardContent>
			</GlassCard>

			{/* Short list: under the card. Tall list: fixed bottom dock + shadow. */}
			<TasksBulkBar
				count={selectedIds.size}
				canAssign={canAssign}
				canEdit={canCreate}
				people={people}
				placement={bulkPlacement}
				onAssign={(assigneeId) => void handleBulk("assign", { assigneeId })}
				onStatus={(status) => void handleBulk("status", { status })}
				onPriority={(priority: TaskPriority) =>
					void handleBulk("priority", { priority })
				}
				onDelete={() => setBulkDeleteOpen(true)}
				onClear={() => setSelectedIds(new Set())}
			/>

			<TaskDetailSheet
				task={openTask}
				open={Boolean(openTask)}
				onOpenChange={(open) => {
					if (!open) setOpenTaskId(null);
				}}
				people={people}
				timeZone={timeZone}
				canEdit={canCreate}
				canAssign={canAssign}
				onStatusChange={(id, status) => void patchTask(id, { status })}
				onPriorityChange={(id, priority) => void patchTask(id, { priority })}
				onAssigneeChange={(id, assigneeId) =>
					void patchTask(id, { assigneeId })
				}
				onDueChange={(id, dueDate) =>
					void patchTask(id, { dueDate: dueDate || null })
				}
				onDuplicate={(task) => void handleDuplicate(task)}
				onDelete={(id) => void handleDelete(id)}
			/>

			<DeleteConfirmationDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
				title="Delete selected tasks?"
				description="Selected tasks will be soft-deleted. You can undo from the toast right after."
				itemNoun="task"
				items={tasks
					.filter((t) => selectedIds.has(t.$id))
					.map((t) => ({ id: t.$id, name: t.title }))}
				onConfirm={() => void confirmBulkDelete()}
				isLoading={bulkDeleting}
				confirmLabel={`Delete ${selectedIds.size} task${selectedIds.size === 1 ? "" : "s"}`}
			/>
		</TasksPageShell>
	);
}
