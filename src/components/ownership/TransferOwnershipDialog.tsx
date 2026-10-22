"use client";

import { ArrowRightLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useStepUp } from "@/contexts/StepUpContext";
import { useToast } from "@/hooks/use-toast";

type DirectoryUser = {
	$id: string;
	fullName: string;
	email: string;
};

interface TransferOwnershipDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Human label shown in copy, e.g. contract or license name */
	itemName: string;
	itemKind: "contract" | "license";
	transferUrl: string;
	excludeUserId?: string;
	onTransferred?: () => void;
}

export function TransferOwnershipDialog({
	open,
	onOpenChange,
	itemName,
	itemKind,
	transferUrl,
	excludeUserId,
	onTransferred,
}: TransferOwnershipDialogProps) {
	const { orgId } = useOrganization();
	const { toast } = useToast();
	const { ensureStepUp } = useStepUp();
	const [users, setUsers] = useState<DirectoryUser[]>([]);
	const [toUserId, setToUserId] = useState("");
	const [busy, setBusy] = useState(false);
	const [loadingUsers, setLoadingUsers] = useState(false);

	useEffect(() => {
		if (!open || !orgId) return;
		setToUserId("");
		setLoadingUsers(true);
		void fetch("/api/users/directory", {
			headers: { "x-org-id": orgId },
		})
			.then(async (res) => {
				const body = await res.json().catch(() => []);
				const list = (
					Array.isArray(body) ? body : body.users || []
				) as DirectoryUser[];
				setUsers(list.filter((row) => row.$id && row.$id !== excludeUserId));
			})
			.catch(() => setUsers([]))
			.finally(() => setLoadingUsers(false));
	}, [excludeUserId, open, orgId]);

	const handleTransfer = async () => {
		if (!orgId || !toUserId) return;
		if (!(await ensureStepUp())) return;
		setBusy(true);
		try {
			const res = await fetch(transferUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-org-id": orgId,
				},
				body: JSON.stringify({ toUserId }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(body.error || "Transfer failed");
			}
			toast({
				title: "Ownership transferred",
				description: `${itemName} now belongs to the selected user.`,
			});
			onOpenChange(false);
			onTransferred?.();
		} catch (error) {
			toast({
				title: "Could not transfer",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh]"
			pending={busy}
			icon={<ArrowRightLeft className="h-5 w-5" />}
			title={`Transfer ${itemKind}`}
			description={`Pass ownership of ${itemName} to another person in your org. Approvals and negotiation stay active under the new owner.`}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
						disabled={busy}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="btn-primary px-3 sm:px-4"
						disabled={busy || !toUserId}
						onClick={() => void handleTransfer()}
					>
						<ArrowRightLeft className="h-4 w-4" />
						Transfer ownership
					</Button>
				</>
			}
		>
			<label className="block pb-1 text-sm font-medium text-slate-700">
				New owner
				<Select value={toUserId} onValueChange={setToUserId}>
					<SelectTrigger className="mt-1 h-10 border-[0.25px] border-slate-300 bg-white">
						<SelectValue
							placeholder={loadingUsers ? "Loading people…" : "Select a user"}
						/>
					</SelectTrigger>
					<SelectContent>
						{users.map((user) => (
							<SelectItem key={user.$id} value={user.$id}>
								{user.fullName} · {user.email}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</label>
		</AppDialog>
	);
}
