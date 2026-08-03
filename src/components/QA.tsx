"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle, MailOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import LandingSection from "./landing/LandingSection";
import { FAQ_ITEMS } from "./landing/landingContent";
import { fadeUp, softRise, staggerFast, viewportOnce } from "./landing/motion";

export default function QA() {
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	return (
		<LandingSection id="faq" ariaLabelledBy="qa-heading" featuresBg>
			<motion.div
				className="max-w-3xl mx-auto relative z-10"
				variants={staggerFast}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div variants={fadeUp} className="mb-6 flex justify-center">
					<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
						<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
							<HelpCircle className="h-3.5 w-3.5 text-slate-700" />
						</span>
						<span className="text-slate-700 text-sm">FAQ</span>
					</div>
				</motion.div>

				<motion.h2
					id="qa-heading"
					variants={fadeUp}
					className="text-center text-2xl sm:text-3xl md:text-[3em] py-2 sidebar-gradient-text landing-section-title"
				>
					Questions? Answers!
				</motion.h2>
				<motion.p
					variants={softRise}
					className="mt-2 text-center text-slate-700 text-sm sm:text-base"
				>
					Find quick answers to the most common questions about our platform
				</motion.p>

				<div className="mt-8 space-y-3">
					{FAQ_ITEMS.map((item, index) => {
						const isOpen = openIndex === index;
						return (
							<motion.div
								key={item.question}
								variants={softRise}
								className="rounded-lg shadow-md bg-[#f6fafd]/50 border border-white overflow-hidden"
							>
								<button
									type="button"
									aria-expanded={isOpen}
									aria-controls={`qa-panel-${index}`}
									onClick={() =>
										setOpenIndex((prev) => (prev === index ? null : index))
									}
									className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left cursor-pointer transition-colors duration-200 hover:bg-white/40"
								>
									<span className="text-slate-700 font-medium sm:font-semibold">
										{item.question}
									</span>
									<ChevronDown
										className={cn(
											"h-5 w-5 shrink-0 text-slate-700 transition-transform duration-200",
											isOpen ? "rotate-180" : "rotate-0",
										)}
										aria-hidden
									/>
								</button>
								<AnimatePresence initial={false}>
									{isOpen && (
										<motion.div
											id={`qa-panel-${index}`}
											role="region"
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: "auto" }}
											exit={{ opacity: 0, height: 0 }}
											transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
											className="overflow-hidden"
										>
											<div className="mx-4 sm:mx-5 border-t border-slate-200/70" />
											<p className="px-4 sm:px-5 pt-3 pb-4 text-slate-700 text-sm sm:text-base">
												{item.answer}
											</p>
										</motion.div>
									)}
								</AnimatePresence>
							</motion.div>
						);
					})}
				</div>

				<motion.div
					variants={fadeUp}
					className="mt-8 text-slate-600 text-sm text-center"
				>
					<span className="inline-flex items-center gap-2">
						<span aria-hidden>
							<MailOpen className="h-4 w-4 text-slate-700" />
						</span>
						<span>
							Still have questions?{" "}
							<a
								className="underline decoration-slate-400 hover:text-slate-900"
								href="mailto:support@caalmsolutions.com"
							>
								support@caalmsolutions.com
							</a>
						</span>
					</span>
				</motion.div>
			</motion.div>
		</LandingSection>
	);
}
