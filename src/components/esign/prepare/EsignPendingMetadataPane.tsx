"use client";

import { Check, Copy, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSignerColorWay } from "@/lib/esign/signer-colors";
import type { EsignEnvelope, EsignRecipient } from "@/lib/esign/types";
import { cn } from "@/lib/utils";

function initials(name: string, email: string): string {
	const source = name.trim() || email.trim();
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
	}
	return source.slice(0, 2).toUpperCase() || "?";
}

function formatActivityWhen(iso?: string): string {
	if (!iso) return "Just now";
	const date = new Date(iso);
	const diffMs = Date.now() - date.getTime();
	if (diffMs < 60_000) return "Just now";
	if (diffMs < 3_600_000) {
		const mins = Math.max(1, Math.round(diffMs / 60_000));
		return `${mins} min ago`;
	}
	return date.toLocaleDateString();
}

export function EsignPendingMetadataPane({
	envelope,
	currentUserEmail,
	links,
}: {
	envelope: EsignEnvelope;
	currentUserEmail?: string;
	links: Array<{ recipientId: string; url: string; token?: string }>;
}) {
	const router = useRouter();
	const [copiedRecipientId, setCopiedRecipientId] = useState<string | null>(
		null,
	);
	const copiedTimerRef = useRef<number | null>(null);
	const signers = envelope.recipients.filter((r) => r.role === "signer");
	const signedCount = signers.filter((r) => r.status === "signed").length;
	const nextPendingOrder = Math.min(
		...signers
			.filter((r) => r.status !== "signed" && r.status !== "declined")
			.map((r) => r.order),
		Number.POSITIVE_INFINITY,
	);
	const self = envelope.recipients.find(
		(r) =>
			r.email === currentUserEmail?.toLowerCase() &&
			r.status !== "signed" &&
			r.status !== "declined",
	);
	const selfLink = self
		? links.find((link) => link.recipientId === self.id)
		: undefined;

	useEffect(() => {
		return () => {
			if (copiedTimerRef.current != null) {
				window.clearTimeout(copiedTimerRef.current);
			}
		};
	}, []);

	const copy = async (recipientId: string, url: string) => {
		await navigator.clipboard.writeText(url);
		setCopiedRecipientId(recipientId);
		if (copiedTimerRef.current != null) {
			window.clearTimeout(copiedTimerRef.current);
		}
		copiedTimerRef.current = window.setTimeout(() => {
			setCopiedRecipientId(null);
			copiedTimerRef.current = null;
		}, 1500);
	};

	const activity = [
		{
			id: "sent",
			title: "You sent the document",
			when: formatActivityWhen(envelope.createdAt),
			active: true,
		},
		{
			id: "created",
			title: "You created the document",
			when: formatActivityWhen(envelope.createdAt),
			active: false,
		},
	];

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-xl font-semibold sidebar-gradient-text">
					Document pending
				</h2>
				<p className="mt-1 text-sm text-slate-600">
					Waiting on {signers.length - signedCount} recipient
					{signers.length - signedCount === 1 ? "" : "s"}
				</p>
				{selfLink ? (
					<Button
						className="primary-btn mt-4 !w-full px-3 sm:!w-full sm:px-4"
						onClick={() =>
							router.push(
								`/sign/${encodeURIComponent(selfLink.token || selfLink.url.split("/sign/").pop() || "")}`,
							)
						}
					>
						<PenLine className="h-4 w-4" />
						Sign
					</Button>
				) : null}
			</div>

			<section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
				<div className="border-b border-slate-200 bg-[#e9eef3] px-4 py-3">
					<p className="text-xs text-slate-500">Details</p>
					<h3 className="text-lg font-semibold sidebar-gradient-text">
						Information
					</h3>
				</div>
				<dl className="divide-y divide-slate-200 px-4 text-sm">
					<div className="flex justify-between gap-3 py-3">
						<dt className="text-slate-500">Uploaded by</dt>
						<dd className="font-medium text-slate-700">You</dd>
					</div>
					<div className="flex justify-between gap-3 py-3">
						<dt className="text-slate-500">Created</dt>
						<dd className="font-medium text-slate-700">
							{envelope.createdAt
								? new Date(envelope.createdAt).toLocaleDateString()
								: "—"}
						</dd>
					</div>
					<div className="flex justify-between gap-3 py-3">
						<dt className="text-slate-500">Document ID</dt>
						<dd className="truncate font-medium text-slate-700">
							{envelope.resourceId.slice(0, 10)}
						</dd>
					</div>
				</dl>
			</section>

			<section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
				<div className="flex items-end justify-between gap-3 border-b border-slate-200 bg-[#e9eef3] px-4 py-3">
					<div>
						<p className="text-xs text-slate-500">Recipients</p>
						<h3 className="text-lg font-semibold sidebar-gradient-text">
							Signers
						</h3>
					</div>
					<p className="pb-0.5 text-xs text-slate-500">
						{signedCount} of {signers.length} signed
					</p>
				</div>
				<ul className="space-y-3 px-4 py-3">
					{signers.map((recipient) => {
						const colors = getSignerColorWay(recipient.id, signers);
						const link = links.find((row) => row.recipientId === recipient.id);
						const isNext =
							recipient.status !== "signed" &&
							recipient.status !== "declined" &&
							recipient.order === nextPendingOrder;
						const copied = copiedRecipientId === recipient.id;
						return (
							<li
								key={recipient.id}
								className="flex items-center justify-between gap-3"
							>
								<div className="flex min-w-0 items-center gap-3">
									<span
										className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
										style={{
											backgroundColor: colors.fill,
											color: colors.text,
										}}
										aria-hidden
									>
										{initials(recipient.name, recipient.email)}
									</span>
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-slate-700">
											{recipient.name || recipient.email}
										</p>
										<p className="text-xs text-slate-500">
											Signer · order {recipient.order}
										</p>
									</div>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									{recipientStatus(recipient, isNext)}
									{link ? (
										<TooltipProvider delayDuration={0}>
											<Tooltip open={copied}>
												<TooltipTrigger asChild>
													<button
														type="button"
														className={cn(
															"rounded p-1 text-slate-500 transition-colors duration-200 hover:text-[#0f5384]",
															copied && "text-green",
														)}
														aria-label={
															copied
																? "Signing link copied"
																: `Copy signing link for ${recipient.email}`
														}
														onClick={() => void copy(recipient.id, link.url)}
													>
														{copied ? (
															<Check className="h-4 w-4" aria-hidden />
														) : (
															<Copy className="h-4 w-4" aria-hidden />
														)}
													</button>
												</TooltipTrigger>
												<TooltipContent side="top" className="text-xs">
													Copied!
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									) : null}
								</div>
							</li>
						);
					})}
				</ul>
			</section>

			<section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
				<div className="border-b border-slate-200 bg-[#e9eef3] px-4 py-3">
					<p className="text-xs text-slate-500">Timeline</p>
					<h3 className="text-lg font-semibold sidebar-gradient-text">
						Activity
					</h3>
				</div>
				<ol className="relative space-y-4 px-4 py-3">
					<span
						className="absolute top-5 bottom-5 left-[1.375rem] w-px bg-slate-200"
						aria-hidden
					/>
					{activity.map((item) => (
						<li key={item.id} className="relative flex gap-3">
							<span
								className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${
									item.active ? "bg-[#0f5384]" : "bg-slate-300"
								}`}
								aria-hidden
							/>
							<div className="min-w-0 pt-0.5">
								<p className="text-sm font-semibold leading-5 text-slate-700">
									{item.title}
								</p>
								<p className="text-xs leading-4 text-slate-500">{item.when}</p>
							</div>
						</li>
					))}
				</ol>
			</section>
		</div>
	);
}

function recipientStatus(recipient: EsignRecipient, isNext: boolean) {
	if (recipient.status === "signed") {
		return (
			<span className="inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
				Signed
			</span>
		);
	}
	if (recipient.status === "declined") {
		return (
			<span className="inline-block rounded-full border border-red/20 bg-red/10 px-2 py-0.5 text-xs font-medium text-red">
				Declined
			</span>
		);
	}
	if (isNext) {
		return (
			<span className="inline-block rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-medium text-blue">
				Pending
			</span>
		);
	}
	return <span className="text-xs text-slate-500">Waiting</span>;
}
