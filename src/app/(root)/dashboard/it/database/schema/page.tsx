"use client";

import { Database } from "lucide-react";
import useSWR from "swr";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { LoadingSpinner } from "@/components/ui/loading";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { fetcher } from "@/lib/swr-config";

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
						<span className="text-xs">it.manage_database</span>{" "}
						permission.
					</p>
				</ITGlassPanel>
			) : (
				<ITGlassPanel>
					<p className="text-sm text-slate-600 mb-4">
						{data.data.total} tables in the active database
					</p>
					<div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>ID</TableHead>
									<TableHead>Columns</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.data.tables.map((table) => (
									<TableRow key={table.id}>
										<TableCell className="font-medium text-slate-700">
											{table.name}
										</TableCell>
										<TableCell className="text-xs text-slate-600">
											{table.id}
										</TableCell>
										<TableCell>{table.columns}</TableCell>
										<TableCell>
											{table.enabled ? "Enabled" : "Disabled"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</ITGlassPanel>
			)}
		</ITPageShell>
	);
}
