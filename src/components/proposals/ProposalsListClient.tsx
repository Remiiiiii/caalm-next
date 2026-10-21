"use client";

import { FilePlus2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	CaalmDataTableSkeleton,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
	DATA_TABLE_CELL_FIRST,
	DATA_TABLE_CELL_LAST,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { Proposal, ProposalStatus } from "@/lib/proposals/types";
import { cn } from "@/lib/utils";

const PILL = "inline-block px-2 py-0.5 text-xs rounded-full border";
const STATUS_PILL: Record<ProposalStatus, string> = {
	draft: "bg-slate-100 text-slate-600 border-slate-200",
	in_review: "bg-orange/10 text-orange border-orange/20",
	final: "bg-green/10 text-green border-green/20",
};

function orgHeaders(orgId: string | null): HeadersInit {
	return orgId
		? { "Content-Type": "application/json", "x-org-id": orgId }
		: { "Content-Type": "application/json" };
}

export function ProposalsListClient() {
	const router = useRouter();
	const { orgId } = useOrganization();
	const { permissions } = usePermissions();
	const { toast } = useToast();
	const canCreate = permissions.includes(PERMISSIONS.PROPOSALS.CREATE);
	const [items, setItems] = useState<Proposal[]>([]);
	const [loading, setLoading] = useState(true);
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [corpus, setCorpus] = useState("");
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/proposals", {
				headers: orgHeaders(orgId),
			});
			if (!res.ok) throw new Error("Failed to load proposals");
			const data = (await res.json()) as { items: Proposal[] };
			setItems(data.items || []);
		} catch (error) {
			console.error("[CLIENT] ProposalsListClient:", error);
			toast({
				title: "Could not load proposals",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [orgId, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	async function createProposal() {
		const nextTitle = title.trim();
		if (!nextTitle) return;
		setSaving(true);
		try {
			const res = await fetch("/api/proposals", {
				method: "POST",
				headers: orgHeaders(orgId),
				body: JSON.stringify({
					title: nextTitle,
					corpus: corpus.trim() || undefined,
				}),
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(data.error || "Create failed");
			}
			const data = (await res.json()) as { proposal: Proposal };
			setOpen(false);
			setTitle("");
			setCorpus("");
			router.push(`/contracts/proposals/${data.proposal.$id}`);
		} catch (error) {
			toast({
				title: "Could not create proposal",
				description: error instanceof Error ? error.message : undefined,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}

	return (
		<div data-testid="proposal-list-page">
			<div className="mb-6 flex items-center justify-end">
				{canCreate ? (
					<Button className="primary-btn" onClick={() => setOpen(true)}>
						<FilePlus2 className="h-4 w-4" />
						New proposal
					</Button>
				) : null}
			</div>
			<div className="glass-card relative overflow-hidden">
				<div className="glass-card-cap" />
				{loading ? (
					<CaalmDataTableSkeleton columns={4} rows={5} />
				) : items.length === 0 ? (
					<CaalmDataTableEmpty
						title="No proposals yet"
						description="Open a SAM.gov opportunity and choose Generate proposal, or start one here."
					/>
				) : (
					<CaalmDataTable>
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-2")}>
									Title
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Notice
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Status
								</TableHead>
								<TableHead
									className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4 text-right")}
								>
									Updated
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map((item) => (
								<TableRow
									key={item.$id}
									className={DATA_TABLE_BODY_ROW_CLICKABLE}
									onClick={() =>
										router.push(`/contracts/proposals/${item.$id}`)
									}
								>
									<TableCell className={cn(DATA_TABLE_CELL, DATA_TABLE_CELL_FIRST)}>
										<Link
											href={`/contracts/proposals/${item.$id}`}
											className="font-medium text-slate-800 hover:underline"
											onClick={(event) => event.stopPropagation()}
										>
											{item.title}
										</Link>
									</TableCell>
									<TableCell className={cn(DATA_TABLE_CELL, "px-3")}>
										<span className="text-xs text-slate-500">
											{item.solicitationRef || "—"}
										</span>
									</TableCell>
									<TableCell className={cn(DATA_TABLE_CELL, "px-3")}>
										<span className={cn(PILL, STATUS_PILL[item.status])}>
											{item.status.replace("_", " ")}
										</span>
									</TableCell>
									<TableCell
										className={cn(
											DATA_TABLE_CELL,
											DATA_TABLE_CELL_LAST,
											"text-right text-xs text-slate-500",
										)}
									>
										{new Date(item.$updatedAt).toLocaleDateString()}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</CaalmDataTable>
				)}
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-[600px]">
					<DialogHeader>
						<DialogTitle>Start a proposal</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="proposal-title">Title</Label>
							<Input
								id="proposal-title"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="Agency name + solicitation number"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="proposal-corpus">
								Solicitation text (optional)
							</Label>
							<Textarea
								id="proposal-corpus"
								value={corpus}
								onChange={(event) => setCorpus(event.target.value)}
								placeholder="Paste shall/must/will language from the RFP. You can shred it after you open the workspace."
								className="min-h-[140px]"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button
							className="primary-btn"
							disabled={!title.trim() || saving}
							onClick={() => void createProposal()}
						>
							{saving ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : null}
							Open workspace
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
