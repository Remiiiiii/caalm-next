"use client";

import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { RunbookEditorDialog } from "@/components/it/runbooks/RunbookEditorDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import type {
	IntegrationStatus,
	Runbook,
	RunbookStorageMode,
} from "@/lib/it/runbooks/types";
import {
	BookOpen,
	ExternalLink,
	Plus,
	RefreshCw,
	Search,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const severityClass: Record<string, string> = {
	low: "bg-slate-100 text-slate-700 border-slate-200",
	medium: "bg-blue/10 text-blue border-blue/20",
	high: "bg-orange/10 text-orange border-orange/20",
	critical: "bg-red/10 text-red border-red/20",
};

export function RunbooksCmsPage() {
	const { permissions } = usePermissions();
	const canManage = permissions.includes(PERMISSIONS.IT.MANAGE_RUNBOOKS);

	const [items, setItems] = useState<Runbook[]>([]);
	const [storage, setStorage] = useState<RunbookStorageMode>("memory");
	const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<string>("all");
	const [severity, setSeverity] = useState<string>("all");
	const [editorOpen, setEditorOpen] = useState(false);
	const [editing, setEditing] = useState<Runbook | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			if (search.trim()) params.set("search", search.trim());
			if (status !== "all") params.set("status", status);
			if (severity !== "all") params.set("severity", severity);
			const res = await fetch(`/api/it/runbooks?${params.toString()}`);
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Failed to load runbooks");
			}
			setItems(data.items || []);
			setStorage(data.storage || "memory");
			setIntegrations(data.integrations || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load runbooks");
		} finally {
			setLoading(false);
		}
	}, [search, status, severity]);

	useEffect(() => {
		const t = window.setTimeout(() => {
			void load();
		}, 150);
		return () => window.clearTimeout(t);
	}, [load]);

	return (
		<ITPageShell
			title="Runbooks"
			subtitle="Operational recovery procedures for on-call and IT."
			icon={BookOpen}
			actions={
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						className="primary-btn px-3 sm:px-4"
						onClick={() => void load()}
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</Button>
					{canManage ? (
						<Button
							className="primary-btn px-3 sm:px-4"
							onClick={() => {
								setEditing(null);
								setEditorOpen(true);
							}}
						>
							<Plus className="h-4 w-4" />
							New runbook
						</Button>
					) : null}
				</div>
			}
		>
			<div className="space-y-6">
				{storage === "memory" ? (
					<ITGlassPanel>
						<p className="text-sm text-slate-700">
							Using the in-memory runbook store (seed data included). Configure{" "}
							<code className="rounded bg-white px-1.5 py-0.5 text-xs">
								NEXT_PUBLIC_APPWRITE_RUNBOOKS_COLLECTION
							</code>{" "}
							and create the Appwrite collection for durable production storage.
							See{" "}
							<Link
								href="/docs/runbooks/admin-setup"
								className="font-medium text-[#0f5384] underline underline-offset-2"
							>
								Admin setup
							</Link>
							.
						</p>
					</ITGlassPanel>
				) : null}

				<div className="grid gap-4 lg:grid-cols-3">
					{integrations.map((item) => (
						<ITGlassPanel key={item.provider}>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text capitalize">
										{item.provider}
									</p>
									<p className="mt-1 text-xs text-slate-600">{item.detail}</p>
								</div>
								<Badge
									variant="outline"
									className={
										item.mode === "live"
											? "border-green/20 bg-green/10 text-green"
											: "border-slate-200 bg-white text-slate-600"
									}
								>
									{item.mode}
								</Badge>
							</div>
						</ITGlassPanel>
					))}
				</div>

				<ITGlassPanel>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<div className="relative flex-1">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search title, service, symptoms…"
								className="pl-9 bg-white"
							/>
						</div>
						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger className="w-full bg-white sm:w-40">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								<SelectItem value="published">Published</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="archived">Archived</SelectItem>
							</SelectContent>
						</Select>
						<Select value={severity} onValueChange={setSeverity}>
							<SelectTrigger className="w-full bg-white sm:w-40">
								<SelectValue placeholder="Severity" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All severities</SelectItem>
								<SelectItem value="critical">Critical</SelectItem>
								<SelectItem value="high">High</SelectItem>
								<SelectItem value="medium">Medium</SelectItem>
								<SelectItem value="low">Low</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</ITGlassPanel>

				{error ? (
					<ITGlassPanel>
						<p className="text-sm text-red">{error}</p>
					</ITGlassPanel>
				) : null}

				{loading ? (
					<div className="grid gap-4 md:grid-cols-2">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white/60"
							/>
						))}
					</div>
				) : items.length === 0 ? (
					<ITGlassPanel>
						<div className="flex flex-col items-start gap-2">
							<BookOpen className="h-8 w-8 text-slate-400" />
							<p className="text-base font-medium text-slate-700">
								No runbooks match
							</p>
							<p className="text-sm text-slate-600">
								Adjust filters or create the first recovery procedure for your
								org.
							</p>
						</div>
					</ITGlassPanel>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{items.map((item) => (
							<div
								key={item.$id}
								className="glass-card interactive-glass-card rounded-xl border border-slate-200 transition-all duration-200"
							>
								<div className="glass-card-cap" />
								<div className="p-4 sm:p-6">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-sm font-semibold text-slate-700">
												{item.title}
											</p>
											<p className="mt-1 text-xs text-slate-600">
												{item.summary}
											</p>
										</div>
										<Badge
											variant="outline"
											className={severityClass[item.severity] || ""}
										>
											{item.severity}
										</Badge>
									</div>
									<div className="mt-3 flex flex-wrap gap-2">
										<Badge variant="outline" className="bg-white text-slate-700">
											{item.service}
										</Badge>
										<Badge variant="outline" className="bg-white text-slate-700">
											{item.status}
										</Badge>
										{item.integrationKeys.slice(0, 2).map((key) => (
											<Badge
												key={key}
												variant="outline"
												className="bg-white text-slate-500"
											>
												{key}
											</Badge>
										))}
									</div>
									<div className="mt-4 flex items-center gap-2">
										<Button asChild className="primary-btn px-3 sm:px-4">
											<Link href={`/dashboard/it/incidents/runbooks/${item.$id}`}>
												Open
												<ExternalLink className="h-3.5 w-3.5" />
											</Link>
										</Button>
										{canManage ? (
											<Button
												variant="outline"
												className="primary-btn px-3 sm:px-4"
												onClick={() => {
													setEditing(item);
													setEditorOpen(true);
												}}
											>
												Edit
											</Button>
										) : null}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<RunbookEditorDialog
				open={editorOpen}
				onOpenChange={setEditorOpen}
				initial={editing}
				onSaved={() => {
					setEditorOpen(false);
					void load();
				}}
			/>
		</ITPageShell>
	);
}
