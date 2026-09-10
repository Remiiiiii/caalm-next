"use client";

import { PenLine } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<PenLine className="w-5 h-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Are you sure?
						</DialogTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						You are about to complete signing the following document
					</p>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
						{title}
					</div>
					<p className="text-sm text-slate-600">
						By finishing in <strong className="font-medium text-slate-700">CAALM Execute</strong>,
						you agree to sign and receive related notices electronically under
						the E-Sign Act and other applicable law. The mark you apply —
						drawn, typed, or otherwise captured in CAALM Execute — is treated
						like ink on paper for this transaction.
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
				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
					<Button
						className="primary-btn px-3 sm:px-4"
						onClick={onConfirm}
						disabled={submitting}
					>
						<PenLine className="h-4 w-4" />
						{submitting ? "Signing..." : "Sign"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
