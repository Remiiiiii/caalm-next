"use client";

import { ArrowRight, Flag, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import ShimmerBadge from "@/components/landing/ShimmerBadge";
import {
	createSubmitProgressTicker,
	SubmitProgressIndicator,
} from "@/components/tickets/SubmitProgressIndicator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS } from "@/constants/permissions";
import { useFullWindowOverlayOpen } from "@/hooks/useFullWindowOverlayOpen";
import { usePermissions } from "@/hooks/usePermissions";
import { TICKET_CATEGORIES } from "@/lib/tickets/ticket-intake.constants";
import {
	resolveTicketContextFromPath,
	shouldHideReportIssueFab,
} from "@/lib/tickets/route-module-map";
import { cn } from "@/lib/utils";

export default function ReportIssueFab() {
	const pathname = usePathname();
	const router = useRouter();
	const panelRef = useRef<HTMLDivElement>(null);
	const { permissions, loading } = usePermissions();
	const overlayOpen = useFullWindowOverlayOpen();

	const routeContext = resolveTicketContextFromPath(pathname);
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [category, setCategory] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [submitProgress, setSubmitProgress] = useState(0);
	const [showSubmitProgress, setShowSubmitProgress] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canCreate = permissions.includes(PERMISSIONS.TICKETS.CREATE);
	const hidden =
		loading ||
		!canCreate ||
		shouldHideReportIssueFab(pathname) ||
		overlayOpen;

	useEffect(() => {
		setTitle("");
		setCategory("");
		setSent(false);
		setError(null);
		setShowSubmitProgress(false);
		setSubmitProgress(0);
		setOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!open) return;

		function handlePointerDown(event: MouseEvent) {
			if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}

		document.addEventListener("mousedown", handlePointerDown);
		return () => document.removeEventListener("mousedown", handlePointerDown);
	}, [open]);

	const fullFormHref = (() => {
		const params = new URLSearchParams();
		if (title.trim()) params.set("title", title.trim());
		if (category) params.set("category", category);
		if (routeContext.affectedModule) {
			params.set("module", routeContext.affectedModule);
		}
		const query = params.toString();
		return query ? `/tickets/new?${query}` : "/tickets/new";
	})();

	const handleQuickSubmit = useCallback(
		async (event: FormEvent) => {
			event.preventDefault();
			if (!title.trim() || !category || submitting) return;

			setSubmitting(true);
			setError(null);
			setShowSubmitProgress(true);
			setSubmitProgress(0);

			const stopProgress = createSubmitProgressTicker(setSubmitProgress);

			try {
				const trimmedTitle = title.trim();
				const form = new FormData();
				form.set("title", trimmedTitle);
				form.set(
					"description",
					`Quick report from ${routeContext.pageLabel}.\n\n${trimmedTitle}`,
				);
				form.set("category", category);
				form.set("affectedModule", routeContext.affectedModule);
				form.set("impact", "medium");
				form.set("urgency", "medium");

				const res = await fetch("/api/tickets", { method: "POST", body: form });
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Failed to submit ticket");
				}

				stopProgress();
				setSubmitProgress(100);
				await new Promise((resolve) => setTimeout(resolve, 1200));
				setSent(true);
				window.setTimeout(() => {
					setOpen(false);
					router.push(`/tickets/${data.ticket.$id}`);
				}, 1000);
			} catch (err) {
				stopProgress();
				setShowSubmitProgress(false);
				setSubmitProgress(0);
				setError(
					err instanceof Error ? err.message : "Failed to submit ticket",
				);
			} finally {
				setSubmitting(false);
			}
		},
		[category, routeContext.affectedModule, routeContext.pageLabel, router, submitting, title],
	);

	if (hidden) return null;

	return (
		<div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
			{open ? (
				<div
					ref={panelRef}
					className="pointer-events-auto w-[min(340px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-[fabIn_160ms_ease-out]"
				>
					{sent ? (
						<div className="p-6 text-center">
							<div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue/10">
								<Send className="h-4 w-4 text-[#0f5384]" aria-hidden />
							</div>
							<p className="text-sm font-medium text-slate-700">Ticket logged</p>
							<p className="mt-1 text-xs text-slate-600">
								We tagged it under {routeContext.pageLabel}.
							</p>
						</div>
					) : (
						<form onSubmit={handleQuickSubmit}>
							<div className="flex items-center justify-between px-4 pt-4 pb-1">
								<p className="text-sm font-semibold sidebar-gradient-text">
									Report an issue
								</p>
								<button
									type="button"
									onClick={() => setOpen(false)}
									className="cursor-pointer rounded p-1 text-slate-500 transition-colors duration-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
									aria-label="Close"
								>
									<X className="h-4 w-4" aria-hidden />
								</button>
							</div>
							<p className="px-4 pb-3 text-[11px] text-slate-500">
								Logged from: {routeContext.pageLabel}
							</p>

							<div className="space-y-3 px-4 pb-3">
								<div>
									<Label
										htmlFor="report-issue-title"
										className="mb-1 block text-xs font-medium text-slate-700"
									>
										Title
									</Label>
									<Input
										id="report-issue-title"
										autoFocus
										value={title}
										onChange={(event) => setTitle(event.target.value)}
										placeholder="Summary of the problem"
										maxLength={120}
										className="border-slate-200 bg-white text-sm focus-visible:border-[#078FAB] focus-visible:ring-[#078FAB]"
									/>
								</div>

								<div>
									<Label
										htmlFor="report-issue-category"
										className="mb-1 block text-xs font-medium text-slate-700"
									>
										Category
									</Label>
									<Select value={category || undefined} onValueChange={setCategory}>
										<SelectTrigger
											id="report-issue-category"
											className={cn( "cursor-pointer border-slate-200 bg-white text-sm shadow-sm focus-visible:border-[#078FAB] focus-visible:ring-[#078FAB]", !category && "text-slate-500", )}
										>
											<SelectValue placeholder="Choose a category" />
										</SelectTrigger>
										<SelectContent className="border-slate-200 bg-white/95 shadow-xl backdrop-blur-xl">
											{TICKET_CATEGORIES.map((item) => (
												<SelectItem
													key={item}
													value={item}
													className="cursor-pointer text-slate-700 focus:bg-blue/10"
												>
													{item}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{error ? (
									<p className="text-xs text-red" role="alert">
										{error}
									</p>
								) : null}

								{showSubmitProgress ? (
									<SubmitProgressIndicator
										compact
										progress={submitProgress}
										label="Submitting ticket…"
										successLabel="Ticket submitted successfully"
									/>
								) : null}
							</div>

							<div className="flex items-center justify-between gap-2 px-4 pb-4">
								<Link
									href={fullFormHref}
									className="flex cursor-pointer items-center gap-1 text-xs text-slate-600 transition-colors duration-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
									onClick={() => setOpen(false)}
								>
									Full form <ArrowRight className="h-3 w-3" aria-hidden />
								</Link>
								<Button
									type="submit"
									size="sm"
									className="primary-btn px-4"
									disabled={!title.trim() || !category || submitting}
								>
									{submitting ? "Submitting…" : "Submit"}
								</Button>
							</div>
						</form>
					)}
				</div>
			) : null}

			<ShimmerBadge
				as="button"
				type="button"
				animateOn="hover"
				onClick={() => setOpen((value) => !value)}
				aria-label="Report an issue"
				className="pointer-events-auto h-10 shrink-0 shadow-xl hover:shadow-2xl"
				innerClassName="h-full bg-white px-3 text-sm font-medium text-[#0f5384]"
			>
				{open ? (
					<X className="h-4 w-4 shrink-0" aria-hidden />
				) : (
					<span
						className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full outline-2 -outline-offset-1 outline-[#D6E8F5] bg-[#F1F9FF]"
						aria-hidden
					>
						<Flag className="h-3.5 w-3.5 text-[#0f5384]" />
					</span>
				)}
				{open ? "Close" : "Report issue"}
			</ShimmerBadge>
		</div>
	);
}
