"use client";

import { PenLine } from "lucide-react";
import Link from "next/link";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";

export function EsignDisclosureDialog({
	open,
	onOpenChange,
	title,
	onConfirm,
	submitting,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	onConfirm: () => void;
	submitting?: boolean;
}) {
	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh]"
			pending={submitting}
			icon={<PenLine className="h-5 w-5" />}
			title="Are you sure?"
			description="You are about to complete signing the following document"
			footer={
				<>
					<Button
						type="button"
						variant="ghost"
						className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
						disabled={submitting}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="btn-primary px-3 sm:px-4"
						onClick={onConfirm}
						disabled={submitting}
					>
						<PenLine className="h-4 w-4" />
						{submitting ? "Signing..." : "Sign"}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4 pb-1">
				<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
					{title}
				</div>
				<p className="text-sm text-slate-600">
					By finishing in{" "}
					<strong className="font-medium text-slate-700">
						CAALM Execute
					</strong>
					, you agree to sign and receive related notices electronically under
					the E-Sign Act and other applicable law. The mark you apply — drawn,
					typed, or otherwise captured in CAALM Execute — is treated like ink
					on paper for this transaction.
				</p>
				<p className="text-sm text-slate-600">
					You confirm you can open this document on your device, keep a copy
					(download or print), and receive email about it. Keep your email
					address current so you do not miss status updates.
				</p>
				<p className="text-sm text-slate-600">
					You may withdraw consent before you finish by contacting the sender
					or{" "}
					<a
						href="mailto:support@caalmsolutions.com"
						className="text-[#0f5384] underline"
					>
						support@caalmsolutions.com
					</a>
					. Withdrawing can delay or stop the related workflow. After you
					sign, save your own copy; CAALM keeps an organizational record that
					may not stay available to you indefinitely.
				</p>
				<p className="text-sm text-slate-600">
					Read the full{" "}
					<Link
						href="/sign/disclosure"
						target="_blank"
						className="text-[#0f5384] underline"
					>
						CAALM Execute signature disclosure
					</Link>{" "}
					for system requirements, delivery details, and your acknowledgment.
				</p>
			</div>
		</AppDialog>
	);
}
