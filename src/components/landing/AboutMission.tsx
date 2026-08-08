"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Building2 } from "lucide-react";
import Link from "next/link";
import LandingSection from "./LandingSection";
import { ABOUT_TRUST_BULLETS } from "./landingContent";
import {
	blurIn,
	fadeUp,
	softRise,
	staggerContainer,
	viewportOnce,
} from "./motion";
import { cn } from "@/lib/utils";

const CAALM = {
	teal: "#00C1CB",
	blue: "#0f5384",
	mid: "#0E638F",
	navy: "#162768",
} as const;

function PermissionVisual({ animate }: { animate: boolean }) {
	return (
		<svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden>
			<defs>
				<linearGradient id="perm-grad" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor={CAALM.teal} stopOpacity="0.15" />
					<stop offset="100%" stopColor={CAALM.blue} stopOpacity="0.05" />
				</linearGradient>
			</defs>
			
			{/* Grid background */}
			<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
				<path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.03" />
			</pattern>
			<rect width="200" height="160" fill="url(#grid)" />

			{/* Nodes & Connecting Lines (Placed BEHIND center element) */}
			{[
				{ x: 40, y: 40, access: true },
				{ x: 160, y: 40, access: false },
				{ x: 40, y: 120, access: false },
				{ x: 160, y: 120, access: true },
			].map((node, i) => (
				<motion.g key={i}>
					<motion.path
						d={`M100 80 L${node.x} ${node.y}`}
						stroke={node.access ? CAALM.teal : "#cbd5e1"}
						strokeWidth="1.5"
						strokeDasharray={node.access ? "4 4" : "2 6"}
						animate={animate && node.access ? { strokeDashoffset: [0, -16] } : undefined}
						transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
					/>
					
					<motion.circle
						cx={node.x}
						cy={node.y}
						r="14"
						fill="white"
						stroke={node.access ? CAALM.teal : "#e2e8f0"}
						strokeWidth="1.5"
					/>
					
					{/* Embedded user icon matching the center graphic */}
					<circle cx={node.x} cy={node.y - 3} r="3.5" fill={CAALM.navy} opacity={node.access ? 1 : 0.4} />
					<path d={`M${node.x - 7} ${node.y + 7} C${node.x - 7} ${node.y + 2} ${node.x - 3} ${node.y + 1} ${node.x} ${node.y + 1} C${node.x + 3} ${node.y + 1} ${node.x + 7} ${node.y + 2} ${node.x + 7} ${node.y + 7} Z`} fill={CAALM.navy} opacity={node.access ? 1 : 0.4} />
					
					{/* Status badges overlaid on the outer circles */}
					{node.access ? (
						<g transform={`translate(${node.x + 8}, ${node.y - 8})`}>
							<circle cx="0" cy="0" r="7" fill="white" stroke={CAALM.teal} strokeWidth="1.2" />
							<path d="M-3 0 L-1 2 L3 -2" fill="none" stroke={CAALM.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
						</g>
					) : (
						<g transform={`translate(${node.x + 8}, ${node.y - 8})`}>
							<circle cx="0" cy="0" r="7" fill="white" stroke="#94a3b8" strokeWidth="1.2" />
							<path d="M-2 -2 L2 2 M2 -2 L-2 2" fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
						</g>
					)}
					
					{/* Flowing token for access=true */}
					{node.access && (
						<motion.circle
							r="3"
							fill={CAALM.teal}
							animate={animate ? {
								cx: [100, node.x],
								cy: [80, node.y],
								opacity: [0, 1, 0]
							} : { cx: 100, cy: 80, opacity: 0 }}
							transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
						/>
					)}
				</motion.g>
			))}

			{/* Center Element (Placed ON TOP of lines) */}
			<motion.circle
				cx="100"
				cy="80"
				r="24"
				fill="white"
				stroke={CAALM.blue}
				strokeWidth="2"
			/>
			<motion.circle
				cx="100"
				cy="80"
				r="24"
				fill="url(#perm-grad)"
				stroke="none"
				opacity="0.85"
			/>
			
			{/* Inner user icon */}
			<circle cx="100" cy="73" r="5" fill={CAALM.navy} />
			<path d="M90 89 C90 83 95 81 100 81 C105 81 110 83 110 89 Z" fill={CAALM.navy} />
		</svg>
	);
}

function AuditVisual({ animate }: { animate: boolean }) {
	return (
		<svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden>
			<defs>
				<linearGradient id="audit-grad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={CAALM.teal} stopOpacity="0.1" />
					<stop offset="100%" stopColor={CAALM.blue} stopOpacity="0.0" />
				</linearGradient>
			</defs>
			<pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
				<path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.03" />
			</pattern>
			<rect width="200" height="160" fill="url(#grid2)" />

			{/* Timeline base */}
			<line x1="60" y1="20" x2="60" y2="140" stroke="#e2e8f0" strokeWidth="2" />
			
			{[
				{ y: 30, title: "Created", user: "Admin", delay: 0 },
				{ y: 70, title: "Approved", user: "Manager", delay: 0.5 },
				{ y: 110, title: "Signed", user: "Client", delay: 1.0 },
			].map((event, i) => (
				<motion.g 
					key={i}
					animate={animate ? { opacity: [0.3, 1, 0.3] } : undefined}
					transition={{ duration: 3, repeat: Infinity, delay: event.delay }}
				>
					<circle cx="60" cy={event.y} r="5" fill="white" stroke={CAALM.teal} strokeWidth="2" />
					<rect x="75" y={event.y - 12} width="90" height="24" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="1" />
					<rect x="85" y={event.y - 4} width="40" height="3" rx="1.5" fill={CAALM.navy} opacity="0.6" />
					<rect x="85" y={event.y + 3} width="20" height="2" rx="1" fill={CAALM.mid} opacity="0.4" />
					<circle cx="150" cy={event.y} r="6" fill="url(#audit-grad)" stroke={CAALM.blue} strokeWidth="0.5" />
				</motion.g>
			))}

			{/* Scanning line */}
			<motion.line
				x1="40"
				x2="180"
				y1="20"
				y2="20"
				stroke={CAALM.teal}
				strokeWidth="1"
				opacity="0.5"
				animate={animate ? { y1: [20, 140, 20], y2: [20, 140, 20] } : undefined}
				transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
			/>
			<motion.rect
				x="40"
				y="20"
				width="140"
				height="20"
				fill="url(#audit-grad)"
				animate={animate ? { y: [20, 120, 20] } : undefined}
				transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
			/>
		</svg>
	);
}

function EncryptionVisual({ animate }: { animate: boolean }) {
	return (
		<svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden>
			<defs>
				<linearGradient id="enc-grad" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor={CAALM.teal} stopOpacity="0.2" />
					<stop offset="100%" stopColor={CAALM.navy} stopOpacity="0.05" />
				</linearGradient>
			</defs>
			<pattern id="grid3" width="20" height="20" patternUnits="userSpaceOnUse">
				<path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.03" />
			</pattern>
			<rect width="200" height="160" fill="url(#grid3)" />

			{/* Orbiting shields */}
			<motion.g
				animate={animate ? { rotate: 360 } : undefined}
				transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
				style={{ transformOrigin: "100px 80px" }}
			>
				<circle cx="100" cy="80" r="50" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
				<circle cx="150" cy="80" r="4" fill={CAALM.teal} />
				<circle cx="50" cy="80" r="4" fill={CAALM.blue} />
				<circle cx="100" cy="30" r="4" fill={CAALM.mid} />
				<circle cx="100" cy="130" r="4" fill={CAALM.navy} />
			</motion.g>

			{/* Center lock/file */}
			<rect x="75" y="60" width="50" height="40" rx="4" fill="white" stroke={CAALM.blue} strokeWidth="1.5" />
			<path d="M75 75 L125 75" stroke={CAALM.blue} strokeWidth="1.5" opacity="0.3" />
			<rect x="85" y="85" width="30" height="4" rx="2" fill={CAALM.teal} opacity="0.6" />
			<rect x="85" y="70" width="20" height="4" rx="2" fill={CAALM.mid} opacity="0.4" />

			{/* Shield overlay */}
			<motion.path
				d="M100 45 L115 52 V65 C115 75 108 82 100 85 C92 82 85 75 85 65 V52 Z"
				fill="url(#enc-grad)"
				stroke={CAALM.teal}
				strokeWidth="2"
				animate={animate ? { scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] } : undefined}
				transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
				style={{ transformOrigin: "100px 65px" }}
			/>
		</svg>
	);
}

function DepartmentVisual({ animate }: { animate: boolean }) {
	return (
		<svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden>
			<defs>
				<linearGradient id="dep-grad" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor={CAALM.teal} stopOpacity="0.15" />
					<stop offset="100%" stopColor={CAALM.mid} stopOpacity="0.05" />
				</linearGradient>
			</defs>
			<pattern id="grid4" width="20" height="20" patternUnits="userSpaceOnUse">
				<path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.03" />
			</pattern>
			<rect width="200" height="160" fill="url(#grid4)" />

			{/* Departments (Placed BEHIND central doc) */}
			{[
				{ x: 40, y: 110, color: CAALM.teal },
				{ x: 100, y: 120, color: CAALM.blue },
				{ x: 160, y: 110, color: CAALM.navy },
			].map((dep, i) => (
				<motion.g key={i}>
					<motion.path
						d={`M100 70 L${dep.x} ${dep.y - 20}`}
						stroke={dep.color}
						strokeWidth="1.5"
						strokeDasharray="4 4"
						opacity="0.4"
						animate={animate ? { strokeDashoffset: [0, -16] } : undefined}
						transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
					/>
					<rect x={dep.x - 20} y={dep.y - 15} width="40" height="30" rx="6" fill="white" stroke={dep.color} strokeWidth="1.5" />
					<circle cx={dep.x} cy={dep.y - 4} r="5" fill={dep.color} opacity="0.8" />
					<path d={`M${dep.x - 8} ${dep.y + 8} Q${dep.x} ${dep.y} ${dep.x + 8} ${dep.y + 8} Z`} fill={dep.color} opacity="0.8" />
					
					{/* Flowing doc indicator */}
					<motion.rect
						width="12"
						height="16"
						rx="2"
						fill="white"
						stroke={dep.color}
						strokeWidth="1"
						animate={animate ? {
							x: [100 - 6, dep.x - 6],
							y: [70, dep.y - 25],
							opacity: [0, 1, 0],
							scale: [0.8, 1, 0.8]
						} : { x: 100 - 6, y: 70, opacity: 0 }}
						transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
					/>
				</motion.g>
			))}

			{/* Central Doc (Placed ON TOP) */}
			<motion.rect
				x="85"
				y="30"
				width="30"
				height="40"
				rx="4"
				fill="url(#dep-grad)"
				stroke={CAALM.blue}
				strokeWidth="1.5"
				animate={animate ? { y: [30, 25, 30] } : undefined}
				transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
			/>
			<motion.rect 
				x="92" 
				y="40" 
				width="16" 
				height="3" 
				rx="1.5" 
				fill={CAALM.blue} 
				opacity="0.4"
				animate={animate ? { y: [40, 35, 40] } : undefined}
				transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} 
			/>
			<motion.rect 
				x="92" 
				y="48" 
				width="10" 
				height="3" 
				rx="1.5" 
				fill={CAALM.teal} 
				opacity="0.6"
				animate={animate ? { y: [48, 43, 48] } : undefined}
				transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} 
			/>
		</svg>
	);
}

const VISUALS = [PermissionVisual, AuditVisual, EncryptionVisual, DepartmentVisual];

export default function AboutMission() {
	const reduceMotion = useReducedMotion();

	return (
		<LandingSection id="about">
			<motion.div
				className="max-w-7xl mx-auto"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div variants={blurIn} className="text-center mb-10 sm:mb-14">
					<div className="mb-4 flex justify-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<Building2 className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">About CAALM</span>
						</div>
					</div>
					<h2 className="text-2xl sm:text-3xl md:text-[2.75em] sidebar-gradient-text landing-section-title leading-tight">
						Built for compliance teams who need calm control
					</h2>
					<p className="mt-3 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
						We help organizations centralize contracts, licenses, and audits
						with permission-based access, automated alerts, and clear ownership.
					</p>
				</motion.div>

				{/* 4-column grid reflecting the Saaszai template style */}
				<div className="relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 rounded-2xl border border-slate-200 bg-white/50 shadow-sm overflow-hidden backdrop-blur-sm pt-2">
					{/* Card Cap */}
					<div className="absolute top-0 left-0 right-0 h-2 bg-[#d6d7d8] opacity-70 z-10" aria-hidden />

					{ABOUT_TRUST_BULLETS.map((bullet, idx) => {
						const Visual = VISUALS[idx];
						return (
							<motion.div
								key={bullet.title}
								variants={fadeUp}
								className={cn(
									"relative flex flex-col h-full border-b border-slate-200 xl:border-b-0",
									"xl:border-r last:border-0 md:[&:nth-child(odd)]:border-r md:[&:nth-child(1)]:border-b md:[&:nth-child(2)]:border-b",
								)}
							>
								{/* Text content area */}
								<div className="p-6 sm:p-8 flex-1">
									<div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00C1CB]/15 via-[#0E638F]/10 to-[#162768]/10 border border-slate-200/60 shadow-sm">
										<bullet.icon className="h-5 w-5 text-[#0f5384]" />
									</div>
									<h3 className="text-lg font-semibold sidebar-gradient-text mb-2">
										{bullet.title}
									</h3>
									<p className="text-sm text-slate-600 leading-relaxed">
										{bullet.description}
									</p>
								</div>
								
								{/* Animation area at bottom */}
								<div className="w-full aspect-[5/4] sm:aspect-video xl:aspect-[4/3] bg-slate-50/50 border-t border-slate-100 overflow-hidden relative">
									<Visual animate={!reduceMotion} />
								</div>
							</motion.div>
						);
					})}
				</div>

				<motion.div
					variants={softRise}
					className="mt-8 flex flex-wrap justify-center gap-4 text-sm"
				>
					<Link
						href="/privacy"
						className="text-[#0f5384] underline underline-offset-4 hover:opacity-80 transition-opacity"
					>
						Privacy policy
					</Link>
					<a
						href="#faq"
						className="text-[#0f5384] underline underline-offset-4 hover:opacity-80 transition-opacity"
					>
						Security FAQ
					</a>
				</motion.div>
			</motion.div>
		</LandingSection>
	);
}
