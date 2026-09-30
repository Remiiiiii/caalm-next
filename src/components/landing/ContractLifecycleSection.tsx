"use client";

import {
	AnimatePresence,
	motion,
	useInView,
	useReducedMotion,
} from "framer-motion";
import { ArrowRight, Check, Clock, FileSignature } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import LandingFrostedCard from "./LandingFrostedCard";
import LandingSection from "./LandingSection";
import {
	CONTRACT_LIFECYCLE_STAGES,
	type ContractLifecycleStageId,
} from "./landingContent";
import {
	fadeLeft,
	fadeRight,
	fadeUp,
	staggerContainer,
	viewportOnce,
} from "./motion";

const AUTO_ADVANCE_MS = 5200;

function DocLine({ width, className }: { width: string; className?: string }) {
	return (
		<div
			className={cn("h-2 rounded-full bg-slate-200/80", className)}
			style={{ width }}
		/>
	);
}

function DraftVisual() {
	const fields = [
		{ label: "Party", value: "Riverside Health Network" },
		{ label: "Term", value: "24 months" },
		{ label: "Fee", value: "$48,000 / year" },
	];
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<DocLine width="55%" className="h-2.5 bg-slate-300/80" />
				<DocLine width="90%" />
				<DocLine width="82%" />
			</div>
			<div className="space-y-2">
				{fields.map((field, i) => (
					<motion.div
						key={field.label}
						initial={{ opacity: 0, x: -12 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.15 + i * 0.18, duration: 0.45 }}
						className="flex items-center gap-2 text-xs"
					>
						<span className="w-12 shrink-0 text-slate-500">{field.label}</span>
						<span className="rounded-md border border-[#00C1CB]/30 bg-[#00C1CB]/10 px-2 py-0.5 font-medium text-[#0E638F]">
							{field.value}
						</span>
					</motion.div>
				))}
			</div>
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.75, duration: 0.45 }}
				className="rounded-lg border border-dashed border-[#0f5384]/30 bg-white/70 px-3 py-2 text-xs text-slate-600"
			>
				<span className="font-semibold text-[#0f5384]">+ Clause added:</span>{" "}
				Data processing addendum
			</motion.div>
		</div>
	);
}

function NegotiateVisual() {
	return (
		<div className="space-y-3 text-xs leading-relaxed text-slate-600">
			<DocLine width="50%" className="h-2.5 bg-slate-300/80" />
			<p>
				Either party may end this agreement with{" "}
				<span className="rounded bg-red/10 px-1 text-red line-through decoration-red/70">
					30 days
				</span>{" "}
				<motion.span
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.35, duration: 0.4 }}
					className="rounded bg-green/10 px-1 font-medium text-green underline decoration-green/60"
				>
					60 days
				</motion.span>{" "}
				written notice.
			</p>
			<DocLine width="88%" />
			<DocLine width="72%" />
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.6, duration: 0.45 }}
				className="ml-auto w-[85%] rounded-xl rounded-tr-sm border border-slate-200 bg-white px-3 py-2 shadow-sm"
			>
				<p className="font-semibold text-slate-700">Counterparty</p>
				<p className="text-slate-600">
					Our board meets quarterly. Can we move to 60 days?
				</p>
			</motion.div>
			<div className="flex gap-2">
				<span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-600">
					v2
				</span>
				<span className="inline-block rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-blue">
					v3 compare
				</span>
			</div>
		</div>
	);
}

function ApproveVisual() {
	const steps = [
		{ role: "Legal", state: "done" },
		{ role: "Finance · over $25K", state: "done" },
		{ role: "Executive director", state: "pending" },
	] as const;
	return (
		<div className="relative space-y-4 pl-6">
			<div
				className="absolute left-[11px] top-3 bottom-3 w-px bg-slate-300"
				aria-hidden
			/>
			{steps.map((step, i) => (
				<motion.div
					key={step.role}
					initial={{ opacity: 0, x: 12 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.1 + i * 0.2, duration: 0.45 }}
					className="relative flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5"
				>
					<span
						className={cn(
							"absolute -left-6 flex size-6 items-center justify-center rounded-full ring-4 ring-white",
							step.state === "done"
								? "bg-[#00C1CB] text-white"
								: "bg-orange/15 text-orange",
						)}
					>
						{step.state === "done" ? (
							<Check className="h-3.5 w-3.5" />
						) : (
							<Clock className="h-3.5 w-3.5" />
						)}
					</span>
					<span className="text-xs font-medium text-slate-700">
						{step.role}
					</span>
					<span
						className={cn(
							"inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium",
							step.state === "done"
								? "border-green/20 bg-green/10 text-green"
								: "border-orange/20 bg-orange/10 text-orange",
						)}
					>
						{step.state === "done" ? "Approved" : "Waiting"}
					</span>
				</motion.div>
			))}
			<p className="text-[11px] text-slate-500">
				The requester can&apos;t approve their own contract.
			</p>
		</div>
	);
}

function SignVisual({ reduceMotion }: { reduceMotion: boolean | null }) {
	const statuses = ["Sent", "Viewed", "Signed"];
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				{statuses.map((status, i) => (
					<motion.span
						key={status}
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: i * 0.35, duration: 0.3 }}
						className={cn(
							"inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
							i === statuses.length - 1
								? "border-green/20 bg-green/10 text-green"
								: "border-blue/20 bg-blue/10 text-blue",
						)}
					>
						{status}
					</motion.span>
				))}
			</div>
			<div className="rounded-xl border border-slate-200 bg-white/80 px-4 pt-3 pb-2">
				<svg viewBox="0 0 220 60" className="h-14 w-full" aria-hidden>
					<motion.path
						d="M8 42 C 24 10, 34 10, 38 34 S 52 54, 62 28 S 80 8, 88 36 S 104 50, 118 30 C 130 16, 140 44, 156 30 S 190 24, 210 34"
						fill="none"
						stroke="#162768"
						strokeWidth="2.5"
						strokeLinecap="round"
						initial={{ pathLength: reduceMotion ? 1 : 0 }}
						animate={{ pathLength: 1 }}
						transition={{ duration: 1.4, delay: 0.5, ease: "easeInOut" }}
					/>
				</svg>
				<div className="border-t border-slate-300 pt-1.5 text-[11px] text-slate-500">
					Dana Whitfield · Riverside Health Network
				</div>
			</div>
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 1.6, duration: 0.4 }}
				className="flex items-center gap-2 text-xs text-slate-600"
			>
				<span className="inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 font-medium text-green">
					Active
				</span>
				Contract activated when the last signature landed.
			</motion.div>
		</div>
	);
}

export default function ContractLifecycleSection() {
	const reduceMotion = useReducedMotion();
	const sectionRef = useRef<HTMLDivElement>(null);
	const inView = useInView(sectionRef, { amount: 0.35 });
	const [activeId, setActiveId] = useState<ContractLifecycleStageId>("draft");
	const [userPicked, setUserPicked] = useState(false);

	useEffect(() => {
		if (reduceMotion || userPicked || !inView) return;
		const id = window.setInterval(() => {
			setActiveId((prev) => {
				const index = CONTRACT_LIFECYCLE_STAGES.findIndex((s) => s.id === prev);
				return CONTRACT_LIFECYCLE_STAGES[
					(index + 1) % CONTRACT_LIFECYCLE_STAGES.length
				].id;
			});
		}, AUTO_ADVANCE_MS);
		return () => window.clearInterval(id);
	}, [reduceMotion, userPicked, inView]);

	const activeIndex = CONTRACT_LIFECYCLE_STAGES.findIndex(
		(s) => s.id === activeId,
	);
	const activeStage = CONTRACT_LIFECYCLE_STAGES[activeIndex];

	return (
		<LandingSection
			id="contract-lifecycle"
			ariaLabelledBy="contract-lifecycle-heading"
			className="landing-soft-brand-wash"
		>
			<motion.div
				ref={sectionRef}
				className="max-w-6xl mx-auto"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div variants={fadeUp} className="text-center mb-10 sm:mb-12">
					<div className="mb-4 flex justify-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<FileSignature className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">Contract lifecycle</span>
						</div>
					</div>
					<h2
						id="contract-lifecycle-heading"
						className="text-2xl sm:text-3xl md:text-[2.75em] sidebar-gradient-text landing-section-title leading-tight"
					>
						From first draft to signed, in one place
					</h2>
					<p className="mt-3 text-slate-600 max-w-3xl mx-auto text-sm sm:text-base">
						Draft, negotiate, approve, and sign without emailing Word files back
						and forth. Every step lands in the same audit trail.
					</p>
				</motion.div>

				<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 lg:gap-12 items-center">
					<motion.div
						variants={fadeRight}
						role="tablist"
						aria-label="Contract lifecycle stages"
						className="flex flex-col gap-3"
					>
						{CONTRACT_LIFECYCLE_STAGES.map((stage, i) => {
							const isActive = stage.id === activeId;
							return (
								<button
									key={stage.id}
									type="button"
									role="tab"
									id={`lifecycle-tab-${stage.id}`}
									aria-selected={isActive}
									aria-controls="lifecycle-panel"
									onClick={() => {
										setActiveId(stage.id);
										setUserPicked(true);
									}}
									className={cn(
										"group relative w-full cursor-pointer overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
										isActive
											? "border-[#00C1CB]/40 bg-white/80 shadow-[0_10px_30px_rgba(15,83,132,0.12)]"
											: "border-slate-200 bg-white/40 hover:border-blue-300 hover:bg-white/70",
									)}
								>
									<div className="flex items-start gap-3">
										<span
											className={cn(
												"flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200",
												isActive
													? "border-transparent bg-gradient-to-br from-[#00C1CB] to-[#0f5384] text-white"
													: "border-slate-200 bg-white text-[#0f5384]",
											)}
										>
											<stage.icon className="h-4 w-4" />
										</span>
										<div className="min-w-0">
											<p className="text-xs font-semibold uppercase tracking-wider text-[#0f5384]">
												{String(i + 1).padStart(2, "0")} · {stage.label}
											</p>
											<h3 className="mt-0.5 text-base font-semibold text-slate-800">
												{stage.title}
											</h3>
											{isActive ? (
												<p className="mt-1.5 text-sm text-slate-600">
													{stage.description}
												</p>
											) : null}
										</div>
									</div>
									{isActive && !reduceMotion && !userPicked ? (
										<motion.span
											key={`progress-${stage.id}`}
											className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-[#00C1CB] to-[#0f5384]"
											initial={{ width: "0%" }}
											animate={{ width: "100%" }}
											transition={{
												duration: AUTO_ADVANCE_MS / 1000,
												ease: "linear",
											}}
											aria-hidden
										/>
									) : null}
								</button>
							);
						})}
					</motion.div>

					<motion.div variants={fadeLeft} className="relative">
						<div
							className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[#00C1CB]/15 via-transparent to-[#162768]/10 blur-2xl"
							aria-hidden
						/>
						<LandingFrostedCard
							className="relative"
							contentClassName="p-5 sm:p-7"
						>
							<div className="mb-5 flex items-center justify-between gap-3">
								<div className="flex items-center gap-2">
									<span className="size-2.5 rounded-full bg-red/60" />
									<span className="size-2.5 rounded-full bg-orange/60" />
									<span className="size-2.5 rounded-full bg-green/60" />
									<span className="ml-2 text-xs font-medium text-slate-600">
										Services agreement.docx
									</span>
								</div>
								<span className="inline-block rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-medium text-blue">
									{activeStage.label}
								</span>
							</div>

							<div className="mb-5 flex gap-1.5" aria-hidden>
								{CONTRACT_LIFECYCLE_STAGES.map((stage, i) => (
									<span
										key={stage.id}
										className={cn(
											"h-1.5 flex-1 rounded-full transition-colors duration-300",
											i <= activeIndex ? "bg-[#00C1CB]" : "bg-slate-200",
										)}
									/>
								))}
							</div>

							<div
								id="lifecycle-panel"
								role="tabpanel"
								aria-labelledby={`lifecycle-tab-${activeId}`}
								className="min-h-[15rem] rounded-xl border border-slate-200 bg-white/60 p-4 sm:p-5"
							>
								<AnimatePresence mode="wait">
									<motion.div
										key={activeId}
										initial={{ opacity: 0, y: 12 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -12 }}
										transition={{ duration: 0.3 }}
									>
										{activeId === "draft" ? <DraftVisual /> : null}
										{activeId === "negotiate" ? <NegotiateVisual /> : null}
										{activeId === "approve" ? <ApproveVisual /> : null}
										{activeId === "sign" ? (
											<SignVisual reduceMotion={reduceMotion} />
										) : null}
									</motion.div>
								</AnimatePresence>
							</div>
						</LandingFrostedCard>
					</motion.div>
				</div>

				<motion.div variants={fadeUp} className="mt-10 flex justify-center">
					<a
						href="#contact"
						className="primary-btn primary-btn-lg group inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold cursor-pointer transition-all duration-200 sm:px-6"
					>
						<FileSignature className="h-4 w-4" />
						Walk through a contract
						<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
					</a>
				</motion.div>
			</motion.div>
		</LandingSection>
	);
}
