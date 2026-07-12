"use client";

export const dynamic = "force-dynamic";

import { format } from "date-fns";
import { AlertTriangle, Download, RefreshCw, Shield } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
	AuditLogFiltersPanel,
	AuditLogStatsRow,
	AuditLogTable,
	type AuditLog,
	type AuditLogFilters,
	filterLogsByDomain,
} from "@/components/audits/AuditLogTable";
import { AuditPageShell } from "@/components/audits/AuditPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AUDIT_CONTROL_TABS, type AuditControlDomain } from "@/lib/audits/types";
import { fetcher } from "@/lib/swr-config";
import { useToast } from "@/hooks/use-toast";

const VALID_DOMAINS = AUDIT_CONTROL_TABS.map((t) => t.id);

export default function AuditLogsPage() {
	const { toast } = useToast();
	const searchParams = useSearchParams();
	const domainParam = searchParams?.get("domain") as AuditControlDomain | null;
	const activeDomain =
		domainParam && VALID_DOMAINS.includes(domainParam) ? domainParam : null;

	const [filters, setFilters] = useState<AuditLogFilters>({
		startDate: "",
		endDate: "",
		userId: "",
		action: "all",
		status: "all",
		search: "",
	});
	const [isFiltersOpen, setIsFiltersOpen] = useState(false);

	const {
		data: logsData,
		error: logsError,
		mutate: refreshLogs,
	} = useSWR(
		`/api/audits/logs?${new URLSearchParams({
			...Object.fromEntries(
				Object.entries(filters).filter(([_, v]) => v && v !== "all"),
			),
			limit: "100",
		})}`,
		fetcher,
		{ refreshInterval: 30000 },
	);

	const { data: statsData, error: statsError } = useSWR(
		"/api/audits/stats",
		fetcher,
		{ refreshInterval: 60000 },
	);

	const auditLogs: AuditLog[] = logsData?.logs || [];

	const displayedLogs = useMemo(() => {
		const domainFiltered = filterLogsByDomain(auditLogs, activeDomain);
		const q = filters.search.trim().toLowerCase();
		if (!q) return domainFiltered;
		return domainFiltered.filter(
			(log) =>
				log.event_title.toLowerCase().includes(q) ||
				log.user_name.toLowerCase().includes(q) ||
				log.user_email.toLowerCase().includes(q),
		);
	}, [auditLogs, activeDomain, filters.search]);

	const domainLabel = activeDomain
		? AUDIT_CONTROL_TABS.find((t) => t.id === activeDomain)?.label
		: null;

	const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const clearFilters = () => {
		setFilters({
			startDate: "",
			endDate: "",
			userId: "",
			action: "all",
			status: "all",
			search: "",
		});
	};

	const exportToCSV = async () => {
		try {
			const queryParams = new URLSearchParams({
				...Object.fromEntries(
					Object.entries(filters).filter(([_, v]) => v && v !== "all"),
				),
			});
			const response = await fetch(`/api/audits/logs?${queryParams}`);
			if (!response.ok) throw new Error("Failed to export audit logs");
			const data = await response.json();
			const logs: AuditLog[] = activeDomain
				? filterLogsByDomain(data.logs || [], activeDomain)
				: data.logs || [];

			const headers = [
				"Timestamp",
				"Event ID",
				"Event Title",
				"Action",
				"User",
				"Status",
			];
			const rows = logs.map((log) => [
				log.created_at,
				log.event_id,
				log.event_title,
				log.action,
				log.user_name,
				log.status,
			]);
			const csv = [headers, ...rows]
				.map((row) =>
					row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","),
				)
				.join("\n");
			const blob = new Blob([csv], { type: "text/csv" });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
			toast({ title: "Success", description: "Audit logs exported." });
		} catch {
			toast({
				title: "Error",
				description: "Failed to export audit logs",
				variant: "destructive",
			});
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
							<RefreshCw className="w-4 h-4" />
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
			subtitle="Detailed event history across compliance control domains."
			actions={
				<>
					<Button variant="outline" className="primary-btn px-3 sm:px-4" asChild>
						<Link href="/audits/status">
							<Shield className="h-4 w-4" />
							Compliance controls
						</Link>
					</Button>
					<Button
						onClick={exportToCSV}
						className="primary-btn px-3 sm:px-4"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</Button>
				</>
			}
		>
			<AuditLogStatsRow stats={statsData?.stats} />
			<AuditLogFiltersPanel
				filters={filters}
				onChange={handleFilterChange}
				onClear={clearFilters}
				isOpen={isFiltersOpen}
				onToggle={() => setIsFiltersOpen((v) => !v)}
			/>
			<AuditLogTable logs={displayedLogs} domainLabel={domainLabel} />
		</AuditPageShell>
	);
}
