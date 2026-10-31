/**
 * "License Type assistant" quiz screen — mirrors ContractUploadForm.tsx's
 * "CAALM AI Assistant" quiz exactly (segmented step tabs, framer-motion
 * transitions, result cards with confidence badges). Renders as another
 * branch inside the wizard's single DialogContent, not a nested Dialog —
 * two Radix Dialog roots open at once breaks the overlay/focus-trap.
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, CircleHelp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { isDemoMode } from "@/lib/config/demo-mode";
import {
	getLicenseTypeConfig,
	isDemoLicenseTypeAllowed,
} from "@/lib/licenses/licenseTypeConfigs";
import { cn } from "@/lib/utils";

const TYPE_SELECT_ICON_TILE =
	"flex shrink-0 items-center justify-center rounded-[9px] border border-[#0f5384]/[.12] bg-[#0f5384]/[.07]";
const QUIZ_OPTION_CLASS =
	"group flex w-full cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] border-slate-200 bg-white/85 px-3.5 py-[11px] text-left transition-[border-color,background-color,box-shadow] duration-150 hover:border-[#078fab] hover:bg-[#078fab]/[.04] hover:shadow-[0_2px_10px_rgba(7,143,171,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]";
const QUIZ_ARROW_CHIP_CLASS =
	"flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[#078fab]/[.08] text-[#078fab] transition-[transform,background-color] duration-150 group-hover:translate-x-0.5 group-hover:bg-[#078fab]/[.16]";
const QUIZ_GHOST_BTN_CLASS =
	"inline-flex h-[34px] cursor-pointer items-center rounded-full px-3 text-[12.5px] font-semibold text-slate-400 transition-colors duration-200 hover:bg-black/[.04] hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]";

interface QuizQuestion {
	id: string;
	text: string;
	options: { value: string; label: string }[];
}

const QUESTIONS: QuizQuestion[] = [
	{
		id: "issuedTo",
		text: "Is this license issued to the organization or to an individual?",
		options: [
			{ value: "Organization", label: "The organization" },
			{ value: "Individual", label: "An individual" },
		],
	},
	{
		id: "tiedToLocation",
		text: "Is it tied to a specific building or location?",
		options: [
			{ value: "Yes", label: "Yes" },
			{ value: "No", label: "No" },
		],
	},
	{
		id: "isInsurance",
		text: "Is this an insurance policy or certificate of coverage?",
		options: [
			{ value: "Yes", label: "Yes" },
			{ value: "No", label: "No" },
		],
	},
	{
		id: "area",
		text: "What area does it relate to?",
		options: [
			{ value: "Child welfare", label: "Child welfare / foster care" },
			{ value: "Clinical care", label: "Behavioral health or clinical care" },
			{ value: "Funding", label: "Funding, grants, or events" },
			{
				value: "Corporate compliance",
				label: "Nonprofit & corporate compliance",
			},
			{ value: "Other", label: "Something else" },
		],
	},
];

type Answer = { questionId: string; answer: string };
type Phase = "questions" | "loading" | "result";

interface SuggestionResult {
	primaryTypeId: string;
	confidence: number;
	alternates: Array<{ typeId: string; confidence?: number }>;
	rationale: string;
}

export interface LicenseTypeAssistantProps {
	onBack: () => void;
	onSelectType: (typeId: string) => void;
}

export default function LicenseTypeAssistant({
	onBack,
	onSelectType,
}: LicenseTypeAssistantProps) {
	const [step, setStep] = useState(0);
	const [direction, setDirection] = useState<"forward" | "back">("forward");
	const [phase, setPhase] = useState<Phase>("questions");
	const [answers, setAnswers] = useState<Answer[]>([]);
	const [result, setResult] = useState<SuggestionResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const submit = async (nextAnswers: Answer[]) => {
		setPhase("loading");
		setError(null);
		try {
			const response = await fetch("/api/ai-license-type-suggest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ answers: nextAnswers }),
			});
			if (!response.ok) throw new Error(`Request failed (${response.status})`);
			const data = (await response.json()) as SuggestionResult;
			setResult(data);
		} catch (err) {
			console.error("License type suggestion failed:", err);
			setError(
				"We couldn't reach the AI service. Pick a type below or browse all license types.",
			);
			setResult(null);
		} finally {
			setPhase("result");
		}
	};

	const handleChoice = (value: string) => {
		const question = QUESTIONS[step];
		const nextAnswers = [
			...answers.filter((a) => a.questionId !== question.id),
			{ questionId: question.id, answer: value },
		];
		setAnswers(nextAnswers);

		const nextStep = step + 1;
		if (nextStep < QUESTIONS.length) {
			setDirection("forward");
			setStep(nextStep);
		} else {
			void submit(nextAnswers);
		}
	};

	const resetQuiz = () => {
		setStep(0);
		setDirection("forward");
		setPhase("questions");
		setAnswers([]);
		setResult(null);
		setError(null);
	};

	/** One step back; from the first question, back to the type grid. */
	const handleBack = () => {
		if (phase === "result") {
			setDirection("back");
			setStep(Math.max(0, QUESTIONS.length - 1));
			setPhase("questions");
			return;
		}
		if (step > 0) {
			setDirection("back");
			setStep((s) => s - 1);
			return;
		}
		onBack();
	};

	const handleTab = (value: string) => {
		if (value === "results") return;
		const index = Number(value.slice(1));
		if (!Number.isInteger(index) || index >= QUESTIONS.length) return;
		setDirection(index < step ? "back" : "forward");
		setStep(index);
		setPhase("questions");
	};

	const recommended = result
		? [result.primaryTypeId, ...result.alternates.map((a) => a.typeId)]
				.filter((id) => !isDemoMode() || isDemoLicenseTypeAllowed(id))
				.map((id) => getLicenseTypeConfig(id))
				.filter((c): c is NonNullable<typeof c> => Boolean(c))
		: [];

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
			{/* Header: Back shares a row with the dialog's close button */}
			<div className="shrink-0 border-b border-slate-200 px-6 pb-4 pt-4 pr-12">
				<div className="mb-2 flex h-8 items-center">
					{phase === "loading" ? null : (
						<button
							type="button"
							onClick={handleBack}
							className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-slate-400 transition-colors duration-200 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]"
						>
							<ChevronLeft className="h-[15px] w-[15px]" aria-hidden />
							Back
						</button>
					)}
				</div>
				<div className="flex items-center gap-2.5">
					<div
						className={cn(TYPE_SELECT_ICON_TILE, "h-[34px] w-[34px] bg-white")}
					>
						<CircleHelp
							className="h-[17px] w-[17px] text-[#0f5384]"
							aria-hidden
						/>
					</div>
					<h2
						id="license-quiz-title"
						className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]"
					>
						CAALM License Type Assistant
					</h2>
				</div>
				<p className="mt-1 pl-11 text-[12.5px] leading-normal text-slate-500">
					Answer a few questions to find the best license type for your record.
				</p>
			</div>

			{/* Quiz Content */}
			<div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
				<div className="mx-auto w-full max-w-xl">
					<div className="mb-5 flex justify-center">
						<SegmentedToggle
							ariaLabel="Assistant steps"
							className="max-w-full"
							value={phase === "questions" ? `q${step}` : "results"}
							onChange={handleTab}
							tabs={[
								...QUESTIONS.map((q, index) => ({
									value: `q${index}`,
									label: `Q${index + 1}`,
									ariaLabel: `Question ${index + 1}: ${q.text}`,
									disabled:
										phase === "loading" ||
										(phase === "questions" && index > step),
								})),
								{
									value: "results",
									label: "Results",
									disabled: phase !== "result",
								},
							]}
						/>
					</div>
					<AnimatePresence mode="wait">
						{phase === "questions" && (
							<motion.div
								key={`question-${QUESTIONS[step]?.id ?? step}`}
								initial={{
									opacity: 0,
									x: direction === "forward" ? 100 : -100,
								}}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: direction === "forward" ? -100 : 100 }}
								transition={{ duration: 0.3 }}
								className="w-full"
							>
								<h3
									id={`quiz-q-${QUESTIONS[step].id}`}
									className="mb-4 text-[15px] font-bold leading-snug text-slate-700"
								>
									{QUESTIONS[step].text}
								</h3>
								<div
									role="group"
									aria-labelledby={`quiz-q-${QUESTIONS[step].id}`}
									className="space-y-2"
								>
									{QUESTIONS[step].options.map((opt) => (
										<button
											key={opt.value}
											type="button"
											onClick={() => handleChoice(opt.value)}
											className={QUIZ_OPTION_CLASS}
										>
											<span className="flex-1 text-[13.5px] font-semibold text-slate-700">
												{opt.label}
											</span>
											<span className={QUIZ_ARROW_CHIP_CLASS} aria-hidden>
												<ArrowRight className="h-2.5 w-2.5" />
											</span>
										</button>
									))}
								</div>
							</motion.div>
						)}

						{phase === "loading" && (
							<motion.div
								key="loading"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="flex flex-col items-center justify-center gap-3.5 py-12"
							>
								<div
									className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-100 border-t-[#078fab]"
									aria-hidden
								/>
								<p className="text-[13px] text-slate-500" aria-live="polite">
									Finding the best match for your needs…
								</p>
							</motion.div>
						)}

						{phase === "result" &&
							(error ? (
								<motion.div
									key="error"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="py-5 text-center text-[13px] leading-normal text-slate-500"
								>
									{error}
								</motion.div>
							) : result ? (
								<motion.div
									key="result"
									initial={{ opacity: 0, x: 100 }}
									animate={{ opacity: 1, x: 0 }}
									className="w-full"
								>
									<div className="mb-3.5 flex items-center justify-between">
										<p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
											Recommended for you
										</p>
										<span
											className="text-[11px] text-slate-400"
											aria-live="polite"
										>
											{recommended.length}{" "}
											{recommended.length === 1 ? "result" : "results"}
										</span>
									</div>
									{result.rationale ? (
										<p className="mb-3.5 text-[12.5px] leading-normal text-slate-500">
											{result.rationale}
										</p>
									) : null}
									{result.confidence < 0.4 ? (
										<p className="mb-3.5 rounded-[10px] border border-[#F9AB72]/30 bg-[#F9AB72]/10 px-4 py-3 text-center text-[13px] leading-normal text-[#b45309]">
											We couldn&apos;t confidently match your needs. Review the
											options below, or browse all license types.
										</p>
									) : null}
									{recommended.map((config, idx) => {
										const best = idx === 0;
										const choose = () => onSelectType(config.id);
										return (
											<div
												key={config.id}
												role="button"
												tabIndex={0}
												aria-label={`${config.label} — ${config.steps.length + 2} steps`}
												onClick={choose}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														choose();
													}
												}}
												className={cn(
													"group mb-2.5 flex cursor-pointer flex-col rounded-xl border-[1.5px] bg-white/85 p-3.5 transition-[border-color,background-color,box-shadow] duration-150",
													"hover:border-[#078fab] hover:bg-[#078fab]/[.04] hover:shadow-[0_2px_12px_rgba(7,143,171,0.10)]",
													"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]",
													best ? "border-[#078fab]/35" : "border-slate-200",
												)}
											>
												<div className="mb-2.5 flex items-center gap-2">
													<span
														className={cn(
															"rounded-md border px-2 py-[3px] text-[11px] font-semibold",
															best
																? "border-[#078fab]/25 bg-[#078fab]/10 text-[#078fab]"
																: "border-[#F9AB72]/30 bg-[#F9AB72]/10 text-[#b45309]",
														)}
													>
														{best
															? result.confidence === 0
																? "Default"
																: "✦ Best match"
															: "Also consider"}
													</span>
													{best && result.confidence > 0 ? (
														<span className="text-[11.5px] font-bold text-[#078fab]">
															{Math.round(result.confidence * 100)}% match
														</span>
													) : null}
												</div>
												<div className="mb-2.5 flex items-start gap-3">
													<div
														className={cn(
															TYPE_SELECT_ICON_TILE,
															"h-8 w-8 rounded-lg",
														)}
													>
														<CircleHelp
															className="h-4 w-4 text-[#0f5384]"
															aria-hidden
														/>
													</div>
													<div className="min-w-0 flex-1">
														<p className="text-sm font-bold text-[#0f5384]">
															{config.label}
														</p>
														<p className="text-xs leading-snug text-slate-500">
															{config.description}
														</p>
													</div>
												</div>
												<div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
													<span className="text-[11px] font-semibold text-slate-400">
														{config.steps.length + 2} steps
													</span>
													<span className={QUIZ_ARROW_CHIP_CLASS} aria-hidden>
														<ArrowRight className="h-2.5 w-2.5" />
													</span>
												</div>
											</div>
										);
									})}
								</motion.div>
							) : null)}
					</AnimatePresence>
				</div>
			</div>

			{/* Footer */}
			<div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 pb-4 pt-3.5">
				{phase === "result" ? (
					<>
						<Button type="button" onClick={onBack} className="btn-secondary">
							Browse all types
						</Button>
						<button
							type="button"
							onClick={resetQuiz}
							className={QUIZ_GHOST_BTN_CLASS}
						>
							Retake quiz
						</button>
					</>
				) : phase === "loading" ? (
					<span />
				) : (
					<p className="text-xs text-slate-500">
						Choose an option to continue.
					</p>
				)}
			</div>
		</div>
	);
}
