"use client";

import {
	AlertTriangle,
	Shield,
	ShieldAlert,
	SquareArrowRightExit,
	XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { AuditLogChart } from "@/components/audits/AuditLogChart";
import {
	type AuditLogFilters,
	AuditLogFiltersBar,
} from "@/components/audits/AuditLogFiltersBar";
import {
	type AuditLog,
	AuditLogTable,
} from "@/components/audits/AuditLogTable";
import { AuditPageShell } from "@/components/audits/AuditPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
	AUDIT_CONTROL_TABS,
	type AuditControlDomain,
} from "@/lib/audits/types";
import { fetcher } from "@/lib/swr-config";

const VALID_DOMAINS = AUDIT_CONTROL_TABS.map((t) => t.id);
const PAGE_SIZE = 20;

const EMPTY_FILTERS: AuditLogFilters = {
	startDate: "",
	endDate: "",
	userId: "",
	action: "all",
	status: "all",
	search: "",
	module: "all",
};

export default function AuditLogsPage() {
	const { toast } = useToast();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { permissions } = usePermissions();
	const canExport = permissions.includes(PERMISSIONS.AUDIT.EXPORT);

	const domainParam = searchParams?.get("domain") as AuditControlDomain | null;
	const moduleParam = searchParams?.get("module");
	const activeDomain =
		domainParam && VALID_DOMAINS.includes(domainParam) ? domainParam : null;

	const [filters, setFilters] = useState<AuditLogFilters>({
		...EMPTY_FILTERS,
		module: moduleParam || activeDomain || "all",
	});
	const [page, setPage] = useState(1);
	const [isExporting, setIsExporting] = useState(false);

	const queryString = useMemo(() => {
		const params = new URLSearchParams({
			limit: String(PAGE_SIZE),
			page: String(page),
		});
		if (filters.startDate) params.set("startDate", filters.startDate);
		if (filters.endDate) params.set("endDate", filters.endDate);
		if (filters.userId) params.set("userId", filters.userId);
		if (filters.action && filters.action !== "all") {
			params.set("action", filters.action);
		}
		if (filters.status && filters.status !== "all") {
			params.set("status", filters.status);
		}
		if (filters.search) params.set("search", filters.search);
		if (filters.module && filters.module !== "all") {
			params.set("module", filters.module);
		}
		return params.toString();
	}, [filters, page]);

	const {
		data: logsData,
		error: logsError,
		isLoading: logsLoading,
		mutate: refreshLogs,
	} = useSWR(`/api/audits/logs?${queryString}`, fetcher, {
		refreshInterval: 30000,
	});

	const {
		data: statsData,
		error: statsError,
		isLoading: statsLoading,
	} = useSWR("/api/audits/stats", fetcher, { refreshInterval: 60000 });

	const auditLogs: AuditLog[] = logsData?.logs || [];
	const total = logsData?.total ?? 0;
	const totalPages = logsData?.totalPages ?? 1;
	const stats = statsData?.stats;

	const domainLabel = activeDomain
		? AUDIT_CONTROL_TABS.find((t) => t.id === activeDomain)?.label
		: filters.module !== "all"
			? AUDIT_CONTROL_TABS.find((t) => t.id === filters.module)?.label ||
				filters.module
			: null;

	const handleFilterChange = useCallback(
		(key: keyof AuditLogFilters, value: string) => {
			setFilters((prev) => ({ ...prev, [key]: value }));
			setPage(1);
			if (key === "module") {
				const params = new URLSearchParams(searchParams?.toString() || "");
				if (value === "all") {
					params.delete("module");
					params.delete("domain");
				} else if (VALID_DOMAINS.includes(value as AuditControlDomain)) {
					params.set("domain", value);
					params.set("module", value);
				} else {
					params.set("module", value);
					params.delete("domain");
				}
				const qs = params.toString();
				router.replace(qs ? `/audits/audit?${qs}` : "/audits/audit", {
					scroll: false,
				});
			}
		},
		[router, searchParams],
	);

	const clearFilters = () => {
		setFilters(EMPTY_FILTERS);
		setPage(1);
		router.replace("/audits/audit", { scroll: false });
	};

	const setDomainTab = (domain: AuditControlDomain | "all") => {
		if (domain === "all") {
			handleFilterChange("module", "all");
			return;
		}
		handleFilterChange("module", domain);
	};

	const exportLogs = async (format: "csv" | "json" = "csv") => {
		if (!canExport) {
			toast({
				title: "Permission required",
				description: "You need audit.export permission to export logs.",
				variant: "destructive",
			});
			return;
		}
		setIsExporting(true);
		try {
			const params = new URLSearchParams();
			if (filters.startDate) params.set("startDate", filters.startDate);
			if (filters.endDate) params.set("endDate", filters.endDate);
			if (filters.userId) params.set("userId", filters.userId);
			if (filters.action && filters.action !== "all") {
				params.set("action", filters.action);
			}
			if (filters.status && filters.status !== "all") {
				params.set("status", filters.status);
			}
			if (filters.search) params.set("search", filters.search);
			if (filters.module && filters.module !== "all") {
				params.set("module", filters.module);
			}
			params.set("format", format);

			const response = await fetch(`/api/audits/logs/export?${params}`);
			if (!response.ok) {
				throw new Error("Failed to export audit logs");
			}

			if (format === "json") {
				const data = await response.json();
				const blob = new Blob([JSON.stringify(data, null, 2)], {
					type: "application/json",
				});
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			} else {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			}

			toast({
				title: "Export ready",
				description: `Audit logs exported as ${format.toUpperCase()}.`,
			});
			refreshLogs();
		} catch {
			toast({
				title: "Error",
				description: "Failed to export audit logs",
				variant: "destructive",
			});
		} finally {
			setIsExporting(false);
		}
	};

	if (logsError || statsError) {
		return (
			<AuditPageShell title="Audit logs">
				<Card className="glass-card max-w-md mx-auto mt-12">
					<div className="glass-card-cap" />
					<CardContent className="p-8 text-center">
						<AlertTriangle className="w-12 h-12 text-red mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-red mb-2">
							Error loading audit logs
						</h3>
						<p className="text-slate-600 text-sm mb-4">
							{logsError?.message || statsError?.message}
						</p>
						<div className="flex justify-center">
							<Button onClick={() => refreshLogs()} className="primary-btn">
								Try again
							</Button>
						</div>
					</CardContent>
				</Card>
			</AuditPageShell>
		);
	}

	return (
		<AuditPageShell
			title="Audit logs"
			subtitle="Activity across contracts, licenses, filings, documents, and governance."
			tags={["Retained 12 months", "Org-scoped", "Auditor-ready export"]}
			actions={
				<>
					{canExport ? (
						<>
							<Button
								onClick={() => exportLogs("csv")}
								className="primary-btn px-3 sm:px-4"
								disabled={isExporting}
							>
								<SquareArrowRightExit className="h-4 w-4" />
								Export CSV
							</Button>
							<Button
								variant="outline"
								onClick={() => exportLogs("json")}
								className="primary-btn px-3 sm:px-4"
								disabled={isExporting}
							>
								<SquareArrowRightExit className="h-4 w-4" />
								Export JSON
							</Button>
						</>
					) : null}
				</>
			}
		>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
				{[
					{
						title: "Total events",
						value: stats?.totalEvents ?? "—",
						icon: Shield,
						description: "Logged activity in range",
					},
					{
						title: "Failed actions",
						value: stats?.failedActions ?? "—",
						icon: XCircle,
						description: "Events with failed status",
					},
					{
						title: "Admin changes",
						value: stats?.adminChanges ?? "—",
						icon: ShieldAlert,
						description: "Governance and role updates",
					},
					{
						title: "Exports",
						value: stats?.exports ?? "—",
						icon: SquareArrowRightExit,
						description: "Data export events",
					},
				].map((item) => (
					<Card key={item.title} className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-start justify-between gap-2">
								<p className="text-sm font-medium sidebar-gradient-text">
									{item.title}
								</p>
								<StatCardIcon icon={item.icon} />
							</div>
							<div className="text-3xl font-bold text-slate-700 pt-2">
								{item.value}
							</div>
							<p className="text-xs text-slate-600 mt-1">{item.description}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<AuditLogChart data={stats?.eventsByDate} isLoading={statsLoading} />

			<nav
				className="mb-4 flex flex-wrap gap-1 border-b border-slate-200"
				aria-label="Audit log categories"
			>
				<button
					type="button"
					data-state={filters.module === "all" ? "active" : undefined}
					className="tabs-underline relative cursor-pointer inline-flex items-center px-3 py-2.5 text-sm font-medium text-slate-600 bg-transparent border-0 shadow-none hover:text-slate-700 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 data-[state=active]:text-slate-700"
					onClick={() => setDomainTab("all")}
				>
					All
				</button>
				{AUDIT_CONTROL_TABS.map((tab) => {
					const isActive = filters.module === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							data-state={isActive ? "active" : undefined}
							className="tabs-underline relative cursor-pointer inline-flex items-center px-3 py-2.5 text-sm font-medium text-slate-600 bg-transparent border-0 shadow-none hover:text-slate-700 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 data-[state=active]:text-slate-700"
							onClick={() => setDomainTab(tab.id)}
						>
							{tab.label}
						</button>
					);
				})}
			</nav>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex flex-wrap items-center gap-2 mb-4">
						<p className="text-xl font-semibold sidebar-gradient-text">
							Activity log
						</p>
						{domainLabel ? (
							<Badge
								variant="secondary"
								className="bg-slate-100 text-slate-700"
							>
								{domainLabel}
							</Badge>
						) : null}
						<Badge variant="secondary" className="bg-slate-100 text-slate-700">
							{total} {total === 1 ? "entry" : "entries"}
						</Badge>
					</div>

					<AuditLogFiltersBar
						filters={filters}
						onChange={handleFilterChange}
						onClear={clearFilters}
					/>

					<AuditLogTable
						logs={auditLogs}
						total={total}
						page={page}
						pageSize={PAGE_SIZE}
						totalPages={totalPages}
						onPageChange={setPage}
						isLoading={logsLoading && !logsData}
						embedded
					/>
				</CardContent>
			</Card>
		</AuditPageShell>
	);
}
