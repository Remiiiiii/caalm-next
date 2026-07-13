"use client";

import {
	AlertTriangle,
	CheckCircle,
	Download,
	Shield,
	ShieldAlert,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { AuditLogChart } from "@/components/audits/AuditLogChart";
import {
	AuditLogFiltersBar,
	type AuditLogFilters,
} from "@/components/audits/AuditLogFiltersBar";
import { AuditLogTable, type AuditLog } from "@/components/audits/AuditLogTable";
import { AuditPageShell } from "@/components/audits/AuditPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import {
	AUDIT_CONTROL_TABS,
	type AuditControlDomain,
} from "@/lib/audits/types";
import { fetcher } from "@/lib/swr-config";

const VALID_DOMAINS = AUDIT_CONTROL_TABS.map((t) => t.id);
const PAGE_SIZE = 50;

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

	const { data: statsData, error: statsError, isLoading: statsLoading } = useSWR(
		"/api/audits/stats",
		fetcher,
		{ refreshInterval: 60000 },
	);

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
						<Button onClick={() => refreshLogs()} className="primary-btn">
							Try again
						</Button>
					</CardContent>
				</Card>
			</AuditPageShell>
		);
	}

	return (
		<AuditPageShell
			title="Audit logs"
			subtitle="Activity across contracts, licenses, filings, documents, and governance."
			actions={
				<>
					<Button variant="outline" className="primary-btn px-3 sm:px-4" asChild>
						<Link href="/audits/status">
							<Shield className="h-4 w-4" />
							Compliance status
						</Link>
					</Button>
					{canExport ? (
						<>
							<Button
								onClick={() => exportLogs("csv")}
								className="primary-btn px-3 sm:px-4"
								disabled={isExporting}
							>
								<Download className="h-4 w-4" />
								Export CSV
							</Button>
							<Button
								variant="outline"
								onClick={() => exportLogs("json")}
								className="primary-btn px-3 sm:px-4"
								disabled={isExporting}
							>
								Export JSON
							</Button>
						</>
					) : null}
				</>
			}
		>
			<p className="text-xs text-slate-500 mb-6">
				Events retained 12 months · Org-scoped · Auditor-ready export
			</p>

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
						icon: CheckCircle,
						description: "Data export events",
					},
				].map((item) => (
					<Card key={item.title} className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text">
										{item.title}
									</p>
									<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
										<span>{item.value}</span>
										<span className="inline-block ml-2 pb-1">
											<item.icon className="h-8 w-8 text-slate-600" />
										</span>
									</div>
									<p className="text-xs text-slate-600 mt-1">
										{item.description}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<AuditLogChart data={stats?.eventsByDate} isLoading={statsLoading} />

			<div className="mb-4 flex flex-wrap gap-2">
				<Button
					variant={filters.module === "all" ? "default" : "outline"}
					size="sm"
					className={`cursor-pointer ${filters.module === "all" ? "primary-btn" : ""}`}
					onClick={() => setDomainTab("all")}
				>
					All
				</Button>
				{AUDIT_CONTROL_TABS.map((tab) => (
					<Button
						key={tab.id}
						variant={filters.module === tab.id ? "default" : "outline"}
						size="sm"
						className={`cursor-pointer ${filters.module === tab.id ? "primary-btn" : ""}`}
						onClick={() => setDomainTab(tab.id)}
					>
						{tab.label}
					</Button>
				))}
			</div>

			<AuditLogFiltersBar
				filters={filters}
				onChange={handleFilterChange}
				onClear={clearFilters}
			/>

			<AuditLogTable
				logs={auditLogs}
				domainLabel={domainLabel}
				total={total}
				page={page}
				totalPages={totalPages}
				onPageChange={setPage}
				isLoading={logsLoading && !logsData}
			/>
		</AuditPageShell>
	);
}
