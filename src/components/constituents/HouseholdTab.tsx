"use client";

import { Home, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AddRelationshipDialog } from "@/components/constituents/AddRelationshipDialog";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Constituent, ConstituentRelationship } from "@/lib/constituents";
import { constituentDisplayName } from "@/lib/constituents";

type RelatedRow = ConstituentRelationship & {
	other?: Constituent;
};

export function HouseholdTab({
	constituentId,
	canManage,
}: {
	constituentId: string;
	canManage: boolean;
}) {
	const [rows, setRows] = useState<RelatedRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [addOpen, setAddOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<RelatedRow | null>(null);
	const [deleting, setDeleting] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetch(
				`/api/constituents/${constituentId}/relationships`,
			);
			const data = await response.json();
			const relationships = (data.relationships ||
				[]) as ConstituentRelationship[];
			const others = await Promise.all(
				relationships.map(async (edge) => {
					const otherId =
						edge.fromId === constituentId ? edge.toId : edge.fromId;
					const otherRes = await fetch(`/api/constituents/${otherId}`);
					const otherData = otherRes.ok ? await otherRes.json() : {};
					return { ...edge, other: otherData.constituent as Constituent | undefined };
				}),
			);
			setRows(others);
		} finally {
			setLoading(false);
		}
	}, [constituentId]);

	useEffect(() => {
		void load();
	}, [load]);

	const remove = async () => {
		if (!pendingDelete) return;
		setDeleting(true);
		try {
			const response = await fetch(
				`/api/constituents/${constituentId}/relationships/${pendingDelete.$id}`,
				{ method: "DELETE" },
			);
			if (!response.ok) return;
			setPendingDelete(null);
			await load();
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div>
			{canManage ? (
				<div className="mb-4 flex items-center justify-end">
					<Button
						className="primary-btn px-3 sm:px-4"
						onClick={() => setAddOpen(true)}
					>
						<Plus className="h-4 w-4" />
						Add relationship
					</Button>
				</div>
			) : null}

			{loading ? (
				<p className="text-sm text-slate-600">Loading household…</p>
			) : rows.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<Home className="h-8 w-8 text-[#0f5384]" />
					<p className="mt-3 text-sm font-medium text-slate-700">
						No household yet
					</p>
					<p className="mt-1 max-w-md text-xs text-slate-600">
						Household members and relationships will appear here.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{rows.map((row) => {
						const otherId = row.fromId === constituentId ? row.toId : row.fromId;
						const label = row.other
							? constituentDisplayName(row.other)
							: otherId;
						return (
							<div
								key={row.$id}
								className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
							>
								<div>
									<Link
										href={`/constituents/${otherId}`}
										className="text-sm font-medium text-[#0f5384] hover:underline"
									>
										{label}
									</Link>
									<div className="mt-2 flex flex-wrap gap-2">
										<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-blue/10 text-blue border-blue/20">
											{row.type.charAt(0).toUpperCase() + row.type.slice(1)}
										</span>
										{row.softCredit ? (
											<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-green/10 text-green border-green/20">
												Soft credit
											</span>
										) : null}
									</div>
								</div>
								{canManage ? (
									<DropdownMenu>
										<DropdownMenuTrigger
											className="shad-no-focus rounded-full transition-colors hover:bg-white/30"
											aria-label={`Actions for ${label}`}
										>
											<Image
												src="/assets/icons/dots.svg"
												alt=""
												width={34}
												height={34}
											/>
										</DropdownMenuTrigger>
										<AppDropdownMenuContent align="end">
											<DropdownMenuSeparator />
											<AppDropdownMenuItem
												icon={Trash2}
												tone="danger"
												onClick={() => setPendingDelete(row)}
											>
												Delete
											</AppDropdownMenuItem>
										</AppDropdownMenuContent>
									</DropdownMenu>
								) : null}
							</div>
						);
					})}
				</div>
			)}

			<AddRelationshipDialog
				open={addOpen}
				onOpenChange={setAddOpen}
				constituentId={constituentId}
				onCreated={() => void load()}
			/>
			<DeleteConfirmationDialog
				open={Boolean(pendingDelete)}
				onOpenChange={(open) => {
					if (!open) setPendingDelete(null);
				}}
				title="Remove relationship"
				description="This unlinks the two people. It does not delete either record."
				itemName={
					pendingDelete?.other
						? constituentDisplayName(pendingDelete.other)
						: "relationship"
				}
				onConfirm={() => void remove()}
				isLoading={deleting}
			/>
		</div>
	);
}
