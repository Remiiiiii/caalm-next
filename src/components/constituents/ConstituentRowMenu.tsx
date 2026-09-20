"use client";

import { Eye, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Constituent } from "@/lib/constituents";

export function ConstituentRowMenu({
	constituent,
	canManage,
	onDeleted,
}: {
	constituent: Constituent;
	canManage: boolean;
	onDeleted: (id: string) => void;
}) {
	const router = useRouter();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const displayName = `${constituent.firstName} ${constituent.lastName}`.trim();

	const handleDelete = async () => {
		setDeleting(true);
		try {
			const response = await fetch(`/api/constituents/${constituent.$id}`, {
				method: "DELETE",
			});
			if (!response.ok) return;
			onDeleted(constituent.$id);
			setConfirmOpen(false);
		} finally {
			setDeleting(false);
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					className="shad-no-focus rounded-full transition-colors hover:bg-white/30"
					aria-label={`Actions for ${displayName}`}
				>
					<Image src="/assets/icons/dots.svg" alt="" width={34} height={34} />
				</DropdownMenuTrigger>
				<AppDropdownMenuContent align="end">
					<AppDropdownMenuItem
						icon={Eye}
						onClick={() => router.push(`/constituents/${constituent.$id}`)}
					>
						View
					</AppDropdownMenuItem>
					{canManage ? (
						<>
							<DropdownMenuSeparator />
							<AppDropdownMenuItem
								icon={Trash2}
								tone="danger"
								onClick={() => setConfirmOpen(true)}
							>
								Delete
							</AppDropdownMenuItem>
						</>
					) : null}
				</AppDropdownMenuContent>
			</DropdownMenu>
			<DeleteConfirmationDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Delete constituent"
				description="This removes the person from this organization's file."
				itemName={displayName}
				onConfirm={() => void handleDelete()}
				isLoading={deleting}
			/>
		</>
	);
}
