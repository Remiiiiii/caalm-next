"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { TaskCreateSheet } from "@/components/tasks/TaskCreateSheet";
import {
	type TaskListFilters,
	TasksControlBar,
} from "@/components/tasks/TasksControlBar";
import { TasksPageShell } from "@/components/tasks/TasksPageShell";
import { TasksTable } from "@/components/tasks/TasksTable";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { fetcher } from "@/lib/swr-config";
import type { CreateTaskInput, Task, TaskStatus } from "@/types/tasks";

interface TasksResponse {
	success: boolean;
	data: { tasks: Task[] };
	meta?: { total: number };
}

export default function TeamTasksPage() {
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { orgId } = useOrganization();
	const { toast } = useToast();
	const [createOpen, setCreateOpen] = useState(false);
	const [filters, setFilters] = useState<TaskListFilters>({
		search: "",
		status: "all",
		priority: "all",
		assigneeId: "",
	});
	const [assignees, setAssignees] = useState<
		Array<{ id: string; name: string }>
	>([]);

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
		params.set("limit", "100");
		return `/api/tasks?${params.toString()}`;
	}, [filters]);

	const { data, error, isLoading, mutate } = useSWR<TasksResponse>(
		canAccess ? query : null,
		fetcher,
	);

	useEffect(() => {
		if (!orgId || !permissions.includes(PERMISSIONS.USERS.VIEW)) return;
		fetch(`/api/users?orgId=${encodeURIComponent(orgId)}`)
			.then((r) => (r.ok ? r.json() : []))
			.then((users: Array<{ $id?: string; id?: string; fullName?: string; email?: string }>) => {
				const list = (Array.isArray(users) ? users : []).map((u) => ({
					id: u.$id || u.id || "",
					name: u.fullName || u.email || "User",
				}));
				setAssignees(list.filter((a) => a.id));
			})
			.catch(() => setAssignees([]));
	}, [orgId, permissions]);

	const assigneeNames = useMemo(() => {
		const map: Record<string, string> = {};
		for (const a of assignees) map[a.id] = a.name;
		return map;
	}, [assignees]);

	const tasks = data?.data?.tasks || [];

	const handleCreate = useCallback(
		async (input: CreateTaskInput) => {
			const res = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
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
			await mutate();
		},
		[mutate, toast],
	);

	const handleStatusChange = useCallback(
		async (taskId: string, status: TaskStatus) => {
			const previous = data;
			await mutate(
				(current) => {
					if (!current?.data?.tasks) return current;
					return {
						...current,
						data: {
							...current.data,
							tasks: current.data.tasks.map((task) =>
								task.$id === taskId
									? {
											...task,
											status,
											completedAt:
												status === "done"
													? task.completedAt || new Date().toISOString()
													: task.completedAt,
										}
									: task,
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
					body: JSON.stringify({ status }),
				});
				if (!res.ok) {
					await mutate(previous, { revalidate: false });
					toast({
						title: "Could not update status",
						variant: "destructive",
					});
					return;
				}
				void mutate();
			} catch {
				await mutate(previous, { revalidate: false });
				toast({
					title: "Could not update status",
					variant: "destructive",
				});
			}
		},
		[data, mutate, toast],
	);

	const handleDelete = useCallback(
		async (taskId: string) => {
			const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
			if (!res.ok) {
				toast({ title: "Could not delete task", variant: "destructive" });
				return;
			}
			toast({ title: "Task deleted" });
			await mutate();
		},
		[mutate, toast],
	);

	if (permissionsLoading) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-12 flex justify-center">
				<LoadingSpinner size="sm" label="Loading tasks…" />
			</div>
		);
	}

	if (!canAccess) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-12">
				<p className="text-slate-700">
					You need event create or invite permission to manage tasks.
				</p>
			</div>
		);
	}

	return (
		<TasksPageShell
			canCreate={canCreate}
			onCreate={() => setCreateOpen(true)}
		>
			<GlassCard className="glass-card mb-6">
				<div className="glass-card-cap" />
				<CardContent className="p-0">
					<TasksControlBar
						filters={filters}
						onChange={setFilters}
						assignees={assignees}
					/>
					{isLoading ? (
						<div className="py-12 flex justify-center">
							<LoadingSpinner size="sm" label="Loading…" />
						</div>
					) : error ? (
						<div className="py-12 text-center text-sm text-slate-600">
							Could not load tasks. Refresh and try again.
						</div>
					) : (
						<TasksTable
							tasks={tasks}
							assigneeNames={assigneeNames}
							onStatusChange={handleStatusChange}
							onDelete={handleDelete}
							canEdit={canCreate || canAssign}
						/>
					)}
				</CardContent>
			</GlassCard>

			<TaskCreateSheet
				open={createOpen}
				onOpenChange={setCreateOpen}
				onSubmit={handleCreate}
				assignees={assignees}
				canAssign={canAssign}
			/>
		</TasksPageShell>
	);
}
