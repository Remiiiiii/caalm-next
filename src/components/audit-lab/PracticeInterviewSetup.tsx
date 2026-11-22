"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
	AVATAR_PHOTO_INNER_BORDER,
	AVATAR_PHOTO_RING_GRADIENT,
	AVATAR_PHOTO_RING_PAD,
} from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AUDITOR_PERSONAS,
	type AuditorPersona,
	INTERVIEWER_PROFILES,
} from "@/lib/audit-lab/roleplay";
import type { ReviewSession } from "@/lib/audit-lab/types";
import { cn } from "@/lib/utils";

export function PracticeInterviewSetup({
	sessions,
	sessionId,
	onSessionId,
	persona,
	onPersona,
	actions,
}: {
	sessions: ReviewSession[];
	sessionId: string;
	onSessionId: (id: string) => void;
	persona: AuditorPersona;
	onPersona: (p: AuditorPersona) => void;
	actions?: ReactNode;
}) {
	const selected = INTERVIEWER_PROFILES[persona];
	const selectedSession = sessions.find((s) => s.$id === sessionId);

	return (
		<div className="flex flex-wrap gap-4">
			<Card className="glass-card min-w-80 flex-1 basis-135 overflow-hidden">
				<div className="glass-card-cap" />
				<CardContent className="space-y-5 p-4 sm:p-6">
					<p className="text-sm font-semibold sidebar-gradient-text">
						Set up your practice interview
					</p>

					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							1. Choose your simulation
						</p>
						<Select value={sessionId} onValueChange={onSessionId}>
							<SelectTrigger
								className="glass-form-control h-11! w-full rounded-xl pr-10! text-sm [&_svg]:text-slate-400 [&_svg]:opacity-100"
								aria-label="Simulation"
							>
								<SelectValue placeholder="Choose a simulation" />
							</SelectTrigger>
							<SelectContent>
								{sessions.map((s) => (
									<SelectItem key={s.$id} value={s.$id}>
										{s.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							2. Choose your interviewer
						</p>
						<div className="flex flex-wrap gap-4">
							{AUDITOR_PERSONAS.map((p) => {
								const profile = INTERVIEWER_PROFILES[p];
								const isSelected = p === persona;
								return (
									<button
										key={p}
										type="button"
										onClick={() => onPersona(p)}
										className="flex w-26 flex-col items-center gap-1.5 focus-visible:outline-none"
										aria-pressed={isSelected}
									>
										<span
											className="rounded-full p-(--avatar-ring-pad)"
											style={{
												background: isSelected
													? AVATAR_PHOTO_RING_GRADIENT
													: "transparent",
												["--avatar-ring-pad" as string]: AVATAR_PHOTO_RING_PAD,
											}}
										>
											<span
												className={cn(
													"block h-26 w-26 overflow-hidden rounded-full",
													AVATAR_PHOTO_INNER_BORDER,
												)}
											>
												<Image
													src={profile.img}
													alt={profile.name}
													width={104}
													height={104}
													style={{
														objectPosition: profile.imgPosition ?? "50% 50%",
														transform: profile.imgScale
															? `scale(${profile.imgScale})`
															: undefined,
													}}
													className={cn(
														"h-full w-full object-cover",
														isSelected
															? "grayscale-0 opacity-100"
															: "grayscale opacity-50 transition hover:grayscale-0 hover:opacity-100",
													)}
												/>
											</span>
										</span>
										<span
											className={cn(
												"text-sm",
												isSelected
													? "font-semibold text-[#0f5384]"
													: "text-slate-500",
											)}
										>
											{profile.name}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					<div className="rounded-xl border border-slate-200 bg-white/60 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							What to expect
						</p>
						<p className="mt-1 font-semibold text-[#0f5384]">
							{selected.label}
						</p>
						<p className="mt-1 text-sm text-slate-600">{selected.desc}</p>
					</div>
				</CardContent>
			</Card>

			<div className="relative min-w-70 flex-1 basis-105 overflow-hidden rounded-3xl bg-linear-to-br from-[#0aa8c2]/85 via-[#0f5384]/85 to-[#0a2a48]/85 p-6 backdrop-blur-sm">
				<div
					className="pointer-events-none absolute inset-0 z-0"
					style={{
						backgroundImage:
							"linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(180deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
						backgroundSize: "40px 40px",
						maskImage:
							"radial-gradient(ellipse at top left, transparent 0%, black 95%)",
						WebkitMaskImage:
							"radial-gradient(ellipse at top left, transparent 0%, black 95%)",
					}}
					aria-hidden
				/>
				<div className="relative z-[2] flex h-full flex-col items-center justify-center gap-4 text-center">
					<div className="relative">
						<span
							className="flex rounded-full p-(--avatar-ring-pad)"
							style={{
								background: AVATAR_PHOTO_RING_GRADIENT,
								["--avatar-ring-pad" as string]: AVATAR_PHOTO_RING_PAD,
								boxShadow: "0 0 0 10px rgba(255, 255, 255, 0.25)",
							}}
						>
							<span
								className={cn(
									"block h-45 w-45 overflow-hidden rounded-full",
									AVATAR_PHOTO_INNER_BORDER,
								)}
							>
								<Image
									src={selected.img}
									alt={selected.name}
									width={180}
									height={180}
									style={{
										objectPosition: selected.imgPosition ?? "50% 50%",
										transform: selected.imgScale
											? `scale(${selected.imgScale})`
											: undefined,
									}}
									className="h-full w-full object-cover"
								/>
							</span>
						</span>
						<span className="absolute -bottom-3 left-1/2 z-10 inline-block -translate-x-1/2 whitespace-nowrap rounded-full border border-blue/20 bg-white px-3 py-1 text-xs font-semibold text-[#0f5384] shadow-md">
							{selected.label}
						</span>
					</div>

					<div className="mt-4 flex flex-col items-center gap-1">
						<p className="text-xl font-bold text-white">
							Practice audit interview with {selected.name}
						</p>
						<p className="text-sm text-white/80">
							{selectedSession?.title ?? ""}
						</p>
					</div>

					<div className="mt-6">{actions}</div>
				</div>
			</div>
		</div>
	);
}
