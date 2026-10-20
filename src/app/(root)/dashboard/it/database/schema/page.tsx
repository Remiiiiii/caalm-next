"use client";

import { Database } from "lucide-react";
import useSWR from "swr";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import {
	CaalmDataTable,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { LoadingSpinner } from "@/components/ui/loading";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { fetcher } from "@/lib/swr-config";
import { cn } from "@/lib/utils";

interface SchemaResponse {
	success: boolean;
	data: {
		tables: Array<{
			id: string;
			name: string;
			enabled: boolean;
			columns: number;
		}>;
		total: number;
	};
}

export default function DatabaseSchemaPage() {
	const { data, error, isLoading } = useSWR<SchemaResponse>(
		"/api/it/schema",
		fetcher,
	);

	return (
		<ITPageShell
			title="Database Schema"
			subtitle="Read-only Appwrite tables in the CAALM database"
			icon={Database}
		>
			{isLoading ? (
				<div className="py-12 flex justify-center">
					<LoadingSpinner size="sm" label="Loading schema..." />
				</div>
			) : error || !data?.success ? (
				<ITGlassPanel>
					<p className="text-sm text-slate-600">
						Could not load schema. Confirm you have{" "}
						<span className="text-xs">it.manage_database</span> permission.
					</p>
				</ITGlassPanel>
			) : (
				<ITGlassPanel>
					<p className="text-sm text-slate-600 mb-4">
						{data.data.total} tables in the active database
					</p>
					<CaalmDataTable className="pb-0">
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-3")}>
									Name
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									ID
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Columns
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4")}>
									Status
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="[&_tr:last-child>td]:border-b-0">
							{data.data.tables.map((table) => (
								<TableRow key={table.id} className={DATA_TABLE_BODY_ROW_BASE}>
									<TableCell className="px-3 py-3 pl-4 pr-3 font-medium text-slate-700">
										{table.name}
									</TableCell>
									<TableCell className="px-3 py-3 text-xs text-slate-600">
										{table.id}
									</TableCell>
									<TableCell className="px-3 py-3">{table.columns}</TableCell>
									<TableCell className="px-3 py-3 pl-3 pr-4">
										{table.enabled ? "Enabled" : "Disabled"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</CaalmDataTable>
				</ITGlassPanel>
			)}
		</ITPageShell>
	);
}
