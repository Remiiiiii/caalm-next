"use client";

import { Copy, Eye, RotateCcw, Trash2 } from "lucide-react";
import Image from "next/image";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Contracts-size hollow dots (`dots.svg` 34×34); only show on this row’s hover / focus / open. */
export function TaskRowActions({
	canEdit,
	removed,
	onOpen,
	onDuplicate,
	onDelete,
	onRestore,
}: {
	canEdit: boolean;
	removed?: boolean;
	onOpen: () => void;
	onDuplicate: () => void;
	onDelete: () => void;
	onRestore?: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className="shad-no-focus inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full opacity-0 transition-all duration-200 hover:bg-white/30 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
				aria-label="Task actions"
				onClick={(e) => e.stopPropagation()}
			>
				<Image
					src="/assets/icons/dots.svg"
					alt="dots"
					width={34}
					height={34}
					className="h-[34px] w-[34px] max-h-[34px] max-w-[34px] shrink-0"
					unoptimized
				/>
			</DropdownMenuTrigger>
			<AppDropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
				{removed ? (
					canEdit && onRestore ? (
						<AppDropdownMenuItem icon={RotateCcw} onSelect={onRestore}>
							Restore
						</AppDropdownMenuItem>
					) : null
				) : (
					<>
						<AppDropdownMenuItem icon={Eye} onSelect={onOpen}>
							Open details
						</AppDropdownMenuItem>
						{canEdit ? (
							<AppDropdownMenuItem icon={Copy} onSelect={onDuplicate}>
								Duplicate
							</AppDropdownMenuItem>
						) : null}
						{canEdit ? (
							<>
								<DropdownMenuSeparator />
								<AppDropdownMenuItem
									icon={Trash2}
									tone="danger"
									onSelect={onDelete}
								>
									Delete
								</AppDropdownMenuItem>
							</>
						) : null}
					</>
				)}
			</AppDropdownMenuContent>
		</DropdownMenu>
	);
}
