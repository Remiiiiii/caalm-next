"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type RefObject, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Logo from "../Logo";
import SectionDivider from "../SectionDivider";
import SignupSuccessBanner from "../SignupSuccessBanner";
import { TRUSTED_BRAND_LOGOS } from "./landingContent";
import { fadeUp, staggerContainer } from "./motion";
import PillSwing3D from "./PillSwing3D";
import ShimmerBadge from "./ShimmerBadge";

const VIDEO_SRC = "/assets/video/wave.mp4";
/** Full-quality desktop demo (~25MB / ~18Mbps) — dual soft-loop only above lg */
const DEMO_VIDEO_DESKTOP_SRC = "/assets/video/demo-landing.mp4";
/** Mobile-friendly encode (~5.4MB / ~3Mbps) — single player below lg */
const DEMO_VIDEO_MOBILE_SRC = "/assets/video/caalm-demo-15s.mp4";
const DEMO_POSTER_SRC = "/assets/video/demo-screenshots/06-landing-hero.png";
const NARROW_QUERY = "(max-width: 1023px)";

/** Crossfade lines under the hero H1 — previous copy + current block */
const HERO_CROSSFADE_LINES = [
	"Centralize contracts, audits, and licenses. Automate renewals, prevent missed deadlines, and protect your organization from compliance risk.",
	"Streamline your compliance and agreement processes with CAALM Solutions.",
	"CAALM eliminates fragmented document storage and manual tracking.",
	"Streamline your entire contract lifecycle with our end-to-end solutions.",
	"Secure your compliance, prevent missed deadlines, and protect your organization from financial and reputational risks.",
] as const;

const CROSSFADE_MS = 5500;
const CROSSFADE_EASE_MS = 1800;
/** Soft end→start blend for the hero demo loop */
const DEMO_LOOP_FADE_MS = 700;
const DEMO_LOOP_FADE_S = DEMO_LOOP_FADE_MS / 1000;

const CAALM = {
	teal: "#00C1CB",
	blue: "#0f5384",
	mid: "#0E638F",
	navy: "#162768",
} as const;

function IntegrateVisual({ animate }: { animate: boolean }) {
	return (
		<svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
			<defs>
				<linearGradient id="hero-int-grad" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor={CAALM.teal} stopOpacity="0.35" />
					<stop offset="100%" stopColor={CAALM.blue} stopOpacity="0.15" />
				</linearGradient>
			</defs>
			<rect
				x="78"
				y="18"
				width="44"
				height="52"
				rx="8"
				fill="url(#hero-int-grad)"
				stroke={CAALM.blue}
				strokeWidth="1.5"
			/>
			<rect
				x="88"
				y="28"
				width="24"
				height="8"
				rx="2"
				fill={CAALM.teal}
				opacity="0.5"
			/>
			<rect
				x="88"
				y="42"
				width="24"
				height="8"
				rx="2"
				fill={CAALM.mid}
				opacity="0.35"
			/>
			{[
				{ x: 22, y: 34, label: "HR" },
				{ x: 158, y: 34, label: "IT" },
				{ x: 22, y: 78, label: "Legal" },
				{ x: 158, y: 78, label: "Ops" },
			].map((node, i) => (
				<motion.g
					key={node.label}
					animate={animate ? { y: [0, i % 2 === 0 ? -3 : 3, 0] } : undefined}
					transition={{
						duration: 3.4,
						repeat: Infinity,
						ease: "easeInOut",
						delay: i * 0.25,
					}}
				>
					<rect
						x={node.x}
						y={node.y}
						width="36"
						height="28"
						rx="7"
						fill="white"
						stroke={CAALM.teal}
						strokeWidth="1.25"
					/>
					<circle
						cx={node.x + 12}
						cy={node.y + 14}
						r="4"
						fill={CAALM.teal}
						opacity="0.85"
					/>
					<rect
						x={node.x + 19}
						y={node.y + 10}
						width="12"
						height="3"
						rx="1"
						fill={CAALM.blue}
						opacity="0.45"
					/>
					<rect
						x={node.x + 19}
						y={node.y + 16}
						width="9"
						height="3"
						rx="1"
						fill={CAALM.mid}
						opacity="0.3"
					/>
				</motion.g>
			))}
			{[
				"M58 48 C68 48 70 44 78 44",
				"M122 44 C132 44 134 48 158 48",
				"M58 92 C70 92 74 70 78 62",
				"M122 62 C126 70 130 92 158 92",
			].map((d, i) => (
				<motion.path
					key={d}
					d={d}
					fill="none"
					stroke={i % 2 === 0 ? CAALM.teal : CAALM.blue}
					strokeWidth="1.25"
					strokeDasharray="4 5"
					animate={animate ? { strokeDashoffset: [0, -18] } : undefined}
					transition={{
						duration: 2.2,
						repeat: Infinity,
						ease: "linear",
						delay: i * 0.2,
					}}
				/>
			))}
			<motion.circle
				cx="100"
				cy="44"
				r="3.5"
				fill={CAALM.navy}
				animate={
					animate ? { scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] } : undefined
				}
				transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
			/>
		</svg>
	);
}

function SecurityVisual({ animate }: { animate: boolean }) {
	return (
		<svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
			<defs>
				<linearGradient id="hero-sec-grad" x1="0.5" y1="0" x2="0.5" y2="1">
					<stop offset="0%" stopColor={CAALM.teal} stopOpacity="0.25" />
					<stop offset="100%" stopColor={CAALM.navy} stopOpacity="0.12" />
				</linearGradient>
			</defs>
			{[38, 28, 18].map((r, i) => (
				<motion.circle
					key={r}
					cx="100"
					cy="58"
					r={r}
					fill="none"
					stroke={i === 0 ? CAALM.teal : CAALM.blue}
					strokeWidth="1"
					strokeOpacity={0.35 - i * 0.08}
					strokeDasharray={i === 1 ? "3 7" : undefined}
					animate={animate ? { rotate: i % 2 === 0 ? 360 : -360 } : undefined}
					transition={{
						duration: 14 + i * 4,
						repeat: Infinity,
						ease: "linear",
					}}
					style={{ transformOrigin: "100px 58px" }}
				/>
			))}
			<path
				d="M100 28 L128 40 V62 C128 80 116 90 100 96 C84 90 72 80 72 62 V40 Z"
				fill="url(#hero-sec-grad)"
				stroke={CAALM.blue}
				strokeWidth="1.75"
			/>
			<path
				d="M100 36 L120 44 V60 C120 74 112 82 100 86 C88 82 80 74 80 60 V44 Z"
				fill="white"
				fillOpacity="0.55"
				stroke={CAALM.teal}
				strokeWidth="1.25"
			/>
			<rect
				x="92"
				y="54"
				width="16"
				height="14"
				rx="3"
				fill={CAALM.blue}
				opacity="0.9"
			/>
			<path
				d="M95 54 V50 C95 47 97 45 100 45 C103 45 105 47 105 50 V54"
				fill="none"
				stroke={CAALM.navy}
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
			<circle cx="100" cy="60" r="1.75" fill="white" />
			{[
				{ x: 34, y: 40, t: "SOC" },
				{ x: 148, y: 40, t: "RBAC" },
				{ x: 34, y: 78, t: "AES" },
				{ x: 148, y: 78, t: "SSO" },
			].map((badge, i) => (
				<motion.g
					key={badge.t}
					animate={
						animate
							? { y: [0, i % 2 ? 3 : -3, 0], opacity: [0.75, 1, 0.75] }
							: undefined
					}
					transition={{
						duration: 3,
						repeat: Infinity,
						ease: "easeInOut",
						delay: i * 0.3,
					}}
				>
					<rect
						x={badge.x}
						y={badge.y}
						width="28"
						height="16"
						rx="8"
						fill="white"
						stroke={CAALM.mid}
						strokeWidth="1"
					/>
					<text
						x={badge.x + 14}
						y={badge.y + 11}
						textAnchor="middle"
						fontSize="7"
						fontWeight="700"
						fill={CAALM.blue}
					>
						{badge.t}
					</text>
				</motion.g>
			))}
			<motion.line
				x1="78"
				x2="122"
				y1="50"
				y2="50"
				stroke={CAALM.teal}
				strokeWidth="1.5"
				strokeLinecap="round"
				animate={
					animate
						? { y1: [42, 78, 42], y2: [42, 78, 42], opacity: [0.2, 0.9, 0.2] }
						: undefined
				}
				transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
			/>
		</svg>
	);
}

function OnboardingVisual({ animate }: { animate: boolean }) {
	return (
		<svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
			<defs>
				<linearGradient id="hero-onb-grad" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor={CAALM.teal} stopOpacity="0.3" />
					<stop offset="100%" stopColor={CAALM.blue} stopOpacity="0.1" />
				</linearGradient>
			</defs>
			<motion.path
				d="M28 88 A72 72 0 0 1 172 88"
				fill="none"
				stroke={CAALM.blue}
				strokeWidth="3"
				strokeOpacity="0.15"
				strokeLinecap="round"
			/>
			<motion.path
				d="M28 88 A72 72 0 0 1 172 88"
				fill="none"
				stroke={CAALM.teal}
				strokeWidth="3"
				strokeLinecap="round"
				strokeDasharray="180"
				animate={
					animate
						? { strokeDashoffset: [180, 40, 180] }
						: { strokeDashoffset: 40 }
				}
				transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
			/>
			{[
				{ x: 56, fill: CAALM.blue, y: 12 },
				{ x: 100, fill: CAALM.teal, y: 0 },
				{ x: 144, fill: CAALM.mid, y: 12 },
			].map((p, i) => (
				<motion.g
					key={p.x}
					animate={animate ? { y: [p.y, p.y - 5, p.y] } : { y: p.y }}
					transition={{
						duration: 2.6,
						repeat: Infinity,
						ease: "easeInOut",
						delay: i * 0.35,
					}}
				>
					<circle
						cx={p.x}
						cy="46"
						r="11"
						fill="url(#hero-onb-grad)"
						stroke={p.fill}
						strokeWidth="1.5"
					/>
					<circle cx={p.x} cy="43" r="4" fill={p.fill} />
					<path
						d={`M${p.x - 8} 58 C${p.x - 8} 52 ${p.x - 4} 50 ${p.x} 50 C${p.x + 4} 50 ${p.x + 8} 52 ${p.x + 8} 58`}
						fill={p.fill}
						opacity="0.85"
					/>
				</motion.g>
			))}
			{[
				{ x: 24, y: 18, w: 52 },
				{ x: 124, y: 14, w: 56 },
			].map((card, i) => (
				<motion.g
					key={card.x}
					animate={
						animate
							? {
									y: [0, i === 0 ? 4 : -4, 0],
									rotate: [0, i === 0 ? -2 : 2, 0],
								}
							: undefined
					}
					transition={{
						duration: 3.8,
						repeat: Infinity,
						ease: "easeInOut",
						delay: i * 0.4,
					}}
					style={{
						transformOrigin: `${card.x + card.w / 2}px ${card.y + 14}px`,
					}}
				>
					<rect
						x={card.x}
						y={card.y}
						width={card.w}
						height="28"
						rx="8"
						fill="white"
						stroke={CAALM.blue}
						strokeWidth="1.1"
					/>
					<circle
						cx={card.x + 12}
						cy={card.y + 14}
						r="5"
						fill={CAALM.teal}
						opacity="0.25"
					/>
					<path
						d={`M${card.x + 9.5} ${card.y + 14} L${card.x + 11.5} ${card.y + 16} L${card.x + 15.5} ${card.y + 11.5}`}
						fill="none"
						stroke={CAALM.blue}
						strokeWidth="1.4"
						strokeLinecap="round"
					/>
					<rect
						x={card.x + 22}
						y={card.y + 9}
						width={card.w - 30}
						height="3.5"
						rx="1"
						fill={CAALM.blue}
						opacity="0.35"
					/>
					<rect
						x={card.x + 22}
						y={card.y + 16}
						width={card.w - 36}
						height="3.5"
						rx="1"
						fill={CAALM.teal}
						opacity="0.45"
					/>
				</motion.g>
			))}
		</svg>
	);
}

const HERO_TRUST_PILLARS = [
	{
		id: "integrate",
		title: "Integrate seamlessly into your organization",
		description:
			"Roll CAALM into your existing teams, roles, and workflows without ripping out the tools you already trust.",
		Visual: IntegrateVisual,
	},
	{
		id: "security",
		title: "Enterprise-grade security",
		description:
			"Your data is encrypted and hosted on SOC 2–audited infrastructure. RBAC, SSO, and GDPR-ready processing keep access and personal data under your control.",
		Visual: SecurityVisual,
	},
	{
		id: "onboarding",
		title: "Onboarding support and training included",
		description:
			"Guided setup, live training, and clear ownership so your team is productive from day one.",
		Visual: OnboardingVisual,
	},
] as const;

function safePlay(video: HTMLVideoElement | null) {
	if (!video) return;
	const result = video.play();
	if (result !== undefined) {
		result.catch(() => {});
	}
}

function useIsNarrow(query = NARROW_QUERY) {
	// Mobile-first default avoids briefly requesting the 25MB desktop encode
	const [matches, setMatches] = useState(true);

	useEffect(() => {
		const mediaQuery = window.matchMedia(query);
		const update = () => setMatches(mediaQuery.matches);
		update();
		mediaQuery.addEventListener("change", update);
		return () => mediaQuery.removeEventListener("change", update);
	}, [query]);

	return matches;
}

function useAutoplayLoopVideo(
	videoRef: RefObject<HTMLVideoElement | null>,
	reduceMotion: boolean | null,
	enabled = true,
) {
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		if (reduceMotion || !enabled) {
			video.pause();
			return;
		}

		// Force muted before play — required for autoplay policies
		video.muted = true;
		video.defaultMuted = true;
		video.playsInline = true;
		// Native loop is unreliable on large MP4s in Chromium; also set in JS
		video.loop = true;

		safePlay(video);

		const restartLoop = () => {
			try {
				video.currentTime = 0;
			} catch {
				/* seek can fail mid-decode on large files */
			}
			safePlay(video);
		};

		const onEnded = () => restartLoop();

		const onVisibility = () => {
			if (document.visibilityState === "visible") safePlay(video);
		};

		// If the browser pauses without ending (decode stall), nudge playback
		const onPause = () => {
			if (
				document.visibilityState !== "visible" ||
				video.seeking ||
				reduceMotion
			) {
				return;
			}
			// Near EOF without firing ended — restart; otherwise resume
			if (video.duration && video.currentTime >= video.duration - 0.35) {
				restartLoop();
			} else if (video.paused) {
				safePlay(video);
			}
		};

		video.addEventListener("ended", onEnded);
		video.addEventListener("pause", onPause);
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			video.removeEventListener("ended", onEnded);
			video.removeEventListener("pause", onPause);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [enabled, reduceMotion, videoRef]);
}

/** Crossfade between two synced muted players so the loop seam is soft. */
function useSoftLoopCrossfade(
	primaryRef: RefObject<HTMLVideoElement | null>,
	secondaryRef: RefObject<HTMLVideoElement | null>,
	activeIndex: 0 | 1,
	setActiveIndex: (index: 0 | 1) => void,
	reduceMotion: boolean | null,
	enabled: boolean,
) {
	const crossfadingRef = useRef(false);

	useEffect(() => {
		const primary = primaryRef.current;
		const secondary = secondaryRef.current;
		if (!primary || !secondary) return;

		const active = activeIndex === 0 ? primary : secondary;
		const standby = activeIndex === 0 ? secondary : primary;

		if (reduceMotion || !enabled) {
			primary.pause();
			secondary.pause();
			return;
		}

		for (const video of [primary, secondary]) {
			video.muted = true;
			video.defaultMuted = true;
			video.playsInline = true;
			video.loop = false;
		}

		safePlay(active);

		const onTimeUpdate = () => {
			if (crossfadingRef.current || !active.duration) return;
			if (active.currentTime < active.duration - DEMO_LOOP_FADE_S) return;

			crossfadingRef.current = true;
			try {
				standby.currentTime = 0;
			} catch {
				/* ignore */
			}
			safePlay(standby);
			setActiveIndex(activeIndex === 0 ? 1 : 0);

			window.setTimeout(() => {
				active.pause();
				crossfadingRef.current = false;
			}, DEMO_LOOP_FADE_MS);
		};

		const onVisibility = () => {
			if (document.visibilityState === "visible") safePlay(active);
		};

		active.addEventListener("timeupdate", onTimeUpdate);
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			active.removeEventListener("timeupdate", onTimeUpdate);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [
		activeIndex,
		enabled,
		primaryRef,
		reduceMotion,
		secondaryRef,
		setActiveIndex,
	]);
}

function LogoMarquee() {
	const logos = [
		...TRUSTED_BRAND_LOGOS,
		...TRUSTED_BRAND_LOGOS,
		...TRUSTED_BRAND_LOGOS,
	];
	return (
		<div className="relative w-full overflow-hidden py-2">
			<div className="relative mx-auto w-full max-w-3xl overflow-hidden">
				<div
					className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10"
					style={{
						background:
							"linear-gradient(to right, rgba(255,255,255,0.95) 0%, transparent 100%)",
					}}
				/>
				<div
					className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10"
					style={{
						background:
							"linear-gradient(to left, rgba(255,255,255,0.95) 0%, transparent 100%)",
					}}
				/>
				<div
					className="flex w-max flex-row gap-8 animate-marquee whitespace-nowrap"
					style={{ animationDuration: "32s" }}
				>
					{logos.map((logo, i) => (
						<div
							key={`${logo.alt}-${i}`}
							className="flex shrink-0 items-center gap-2 opacity-70"
						>
							<Image
								src={logo.src}
								alt={logo.alt}
								width={120}
								height={28}
								className="h-6 w-auto"
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default function LandingHero() {
	const reduceMotion = useReducedMotion();
	const isNarrow = useIsNarrow();
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const demoVideoPrimaryRef = useRef<HTMLVideoElement | null>(null);
	const demoVideoSecondaryRef = useRef<HTMLVideoElement | null>(null);
	const demoFrameRef = useRef<HTMLDivElement | null>(null);
	const [crossfadeIndex, setCrossfadeIndex] = useState(0);
	const [demoInView, setDemoInView] = useState(false);
	const [demoShouldLoad, setDemoShouldLoad] = useState(false);
	const [demoLoaded, setDemoLoaded] = useState(false);
	const [demoFailed, setDemoFailed] = useState(false);
	const [demoActiveLayer, setDemoActiveLayer] = useState<0 | 1>(0);

	const demoSrc = isNarrow ? DEMO_VIDEO_MOBILE_SRC : DEMO_VIDEO_DESKTOP_SRC;
	const useSoftCrossfade = !isNarrow && !reduceMotion;

	useEffect(() => {
		if (reduceMotion) return;
		const interval = window.setInterval(() => {
			setCrossfadeIndex((prev) => (prev + 1) % HERO_CROSSFADE_LINES.length);
		}, CROSSFADE_MS);
		return () => window.clearInterval(interval);
	}, [reduceMotion]);

	useEffect(() => {
		const frame = demoFrameRef.current;
		if (!frame) return;

		const mq = window.matchMedia("(min-width: 768px)");
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!mq.matches) return;
				const visible = Boolean(entry?.isIntersecting);
				setDemoInView(visible);
				if (visible) setDemoShouldLoad(true);
			},
			{ rootMargin: "240px 0px", threshold: 0.05 },
		);

		const syncDesktop = () => {
			if (!mq.matches) {
				setDemoInView(false);
				setDemoShouldLoad(false);
				setDemoLoaded(false);
			}
		};
		syncDesktop();
		mq.addEventListener("change", syncDesktop);
		observer.observe(frame);
		return () => {
			mq.removeEventListener("change", syncDesktop);
			observer.disconnect();
		};
	}, []);

	// Reset load state when swapping mobile/desktop sources
	useEffect(() => {
		setDemoLoaded(false);
		setDemoFailed(false);
		setDemoActiveLayer(0);
	}, [demoSrc]);

	useAutoplayLoopVideo(videoRef, reduceMotion);
	useAutoplayLoopVideo(
		demoVideoPrimaryRef,
		reduceMotion,
		demoInView && demoShouldLoad && demoLoaded && !useSoftCrossfade,
	);
	useSoftLoopCrossfade(
		demoVideoPrimaryRef,
		demoVideoSecondaryRef,
		demoActiveLayer,
		setDemoActiveLayer,
		reduceMotion,
		demoInView && demoShouldLoad && demoLoaded && useSoftCrossfade,
	);

	useEffect(() => {
		if (!reduceMotion) return;
		for (const demo of [
			demoVideoPrimaryRef.current,
			demoVideoSecondaryRef.current,
		]) {
			if (!demo) continue;
			demo.pause();
			try {
				demo.currentTime = 0;
			} catch {
				/* ignore */
			}
		}
	}, [reduceMotion]);

	const handleDemoTapToPlay = () => {
		setDemoFailed(false);
		setDemoShouldLoad(true);
		const video = demoVideoPrimaryRef.current;
		if (!video) return;
		safePlay(video);
	};

	return (
		<section className="relative flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden">
			{!reduceMotion ? (
				<video
					ref={videoRef}
					src={VIDEO_SRC}
					autoPlay
					muted
					loop
					playsInline
					preload="metadata"
					onEnded={(e) => {
						const video = e.currentTarget;
						video.currentTime = 0;
						safePlay(video);
					}}
					className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
					aria-hidden
				/>
			) : null}

			<div
				className="absolute inset-0 z-10 pointer-events-none landing-grid-bg-soft"
				aria-hidden
			/>

			<div className="relative z-20 w-full mt-2">
				<SectionDivider />
			</div>

			<Suspense fallback={<div />}>
				<SignupSuccessBanner />
			</Suspense>

			<div className="relative z-20 w-full mt-6 md:mt-8">
				<LogoMarquee />
			</div>

			{/* Logo — reserve height; .logo is absolute and would otherwise collapse layout */}
			<div className="relative z-20 w-full mb-8 md:mb-12 md:mt-4">
				<div className="relative mx-auto h-[140px] w-[140px]">
					<Logo />
				</div>
			</div>

			{/* Intro tagline — separate flow block below logo */}
			<div className="relative z-20 w-full px-4 sm:px-6 mb-8 md:mb-16">
				<motion.div
					className="mx-auto max-w-4xl text-center"
					variants={staggerContainer}
					initial="hidden"
					animate="visible"
				>
					<motion.h2
						variants={fadeUp}
						className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-semibold tracking-tight leading-[1.2] sidebar-gradient-text"
					>
						<span className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] text-center">
							The Renewal You Miss Becomes the Funding You Lose and the Audit
							You Fail
						</span>
					</motion.h2>
					<motion.p
						variants={fadeUp}
						className="mt-4 sm:mt-5 text-sm sm:text-base text-slate-600 max-w-xl mx-auto"
					>
						Your journey to data management and compliance starts here
					</motion.p>
				</motion.div>
			</div>

			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 relative z-20">
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
					{/* Copy + CTAs — first on all breakpoints */}
					<motion.div
						className="order-1 flex flex-col gap-4"
						variants={staggerContainer}
						initial="hidden"
						animate="visible"
					>
						<motion.div variants={fadeUp} className="self-center lg:self-start">
							<ShimmerBadge>
								<div className="flex -space-x-2">
									{[1, 2, 3, 4, 5].map((n) => (
										<Image
											key={n}
											src={`/assets/images/${n}.png`}
											alt=""
											width={24}
											height={24}
											className="h-6 w-6 rounded-full border-2 border-white"
											aria-hidden
										/>
									))}
								</div>
								<span className="text-slate-700 text-sm font-medium relative z-1">
									500+ compliance teams
								</span>
							</ShimmerBadge>
						</motion.div>

						<motion.div variants={fadeUp}>
							{/* Gradient only on text spans — wrapper owns the entrance motion */}
							<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] text-center lg:text-left leading-[1.35] landing-section-title">
								<span className="sidebar-gradient-text font-medium">
									Simplify compliance and stay{" "}
								</span>
								<span className="sidebar-gradient-text font-bold">
									audit-ready
								</span>{" "}
								<span className="sidebar-gradient-text font-medium">with</span>{" "}
								<PillSwing3D className="text-[0.85em]">AI-powered</PillSwing3D>{" "}
								<span className="sidebar-gradient-text font-medium">
									document control
								</span>
							</h1>
						</motion.div>

						<motion.div
							variants={fadeUp}
							className="relative mt-1 mb-1 min-h-[4.5rem] sm:min-h-[5rem] max-w-xl mx-auto lg:mx-0 w-full"
							aria-live="polite"
							aria-atomic="true"
						>
							{reduceMotion ? (
								<p className="text-base sm:text-lg text-slate-600 text-center lg:text-left">
									{HERO_CROSSFADE_LINES[0]}
								</p>
							) : (
								HERO_CROSSFADE_LINES.map((line, i) => (
									<p
										key={line}
										className={`absolute inset-0 text-base sm:text-lg text-slate-600 text-center lg:text-left transition-opacity ease-in-out ${
											crossfadeIndex === i
												? "opacity-100"
												: "opacity-0 pointer-events-none"
										}`}
										style={{ transitionDuration: `${CROSSFADE_EASE_MS}ms` }}
									>
										{line}
									</p>
								))
							)}
						</motion.div>

						<motion.div
							variants={fadeUp}
							className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-2"
						>
							<Link href="/sign-in">
								<Button className="primary-btn px-4 sm:px-6 cursor-pointer group">
									Get Started
									<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
								</Button>
							</Link>
							<a href="#contact">
								<Button className="schedule-demo-btn px-4 sm:px-6 cursor-pointer group">
									Schedule Demo
									<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
								</Button>
							</a>
						</motion.div>

						<motion.div
							variants={fadeUp}
							className="flex items-center justify-center lg:justify-start gap-2 mt-2"
						>
							<span className="text-yellow-500 text-lg" aria-hidden>
								★★★★★
							</span>
							<span className="text-slate-700 font-semibold text-sm">5/5</span>
							<span className="text-slate-500 text-sm">based on reviews</span>
						</motion.div>
					</motion.div>

					{/* Demo — directly after CTAs on mobile; right column on desktop */}
					<motion.div
						className="order-2 relative w-full flex flex-col gap-5 lg:gap-6 lg:row-span-2"
						initial={reduceMotion ? false : { opacity: 0, y: 32 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
					>
						{/* Demo video: desktop only — unreliable layout/playback on small screens */}
						<div
							ref={demoFrameRef}
							className="relative hidden md:block w-full aspect-video overflow-hidden rounded-lg border border-white/70 bg-white/60 shadow-[0_12px_40px_rgba(15,23,42,0.18)] backdrop-blur-md"
						>
							<Image
								src={DEMO_POSTER_SRC}
								alt=""
								fill
								priority
								sizes="(max-width: 1023px) 100vw, 560px"
								className={`object-cover object-center transition-opacity duration-300 ${
									demoLoaded && !reduceMotion ? "opacity-0" : "opacity-100"
								}`}
								aria-hidden
							/>

							{!demoLoaded && !reduceMotion && (
								<div
									aria-hidden
									className="absolute inset-0 z-[1] animate-pulse bg-gradient-to-br from-slate-200/50 via-transparent to-slate-200/40"
								/>
							)}

							{!reduceMotion && demoShouldLoad && (
								<>
									<video
										ref={demoVideoPrimaryRef}
										src={demoSrc}
										muted
										playsInline
										preload={isNarrow ? "metadata" : "auto"}
										autoPlay={demoInView}
										poster={DEMO_POSTER_SRC}
										onLoadedData={() => {
											setDemoLoaded(true);
											setDemoFailed(false);
										}}
										onError={() => setDemoFailed(true)}
										className={`absolute inset-0 z-[2] h-full w-full object-contain object-center brightness-[1.09] contrast-[1.04] transition-opacity ease-in-out ${
											demoLoaded && (!useSoftCrossfade || demoActiveLayer === 0)
												? "opacity-100"
												: "opacity-0"
										}`}
										style={{ transitionDuration: `${DEMO_LOOP_FADE_MS}ms` }}
										aria-label="CAALM product demo"
									/>
									{useSoftCrossfade ? (
										<video
											ref={demoVideoSecondaryRef}
											src={demoSrc}
											muted
											playsInline
											preload="auto"
											className={`absolute inset-0 z-[2] h-full w-full object-contain object-center brightness-[1.09] contrast-[1.04] transition-opacity ease-in-out ${
												demoLoaded && demoActiveLayer === 1
													? "opacity-100"
													: "opacity-0"
											}`}
											style={{ transitionDuration: `${DEMO_LOOP_FADE_MS}ms` }}
											aria-hidden
										/>
									) : null}
								</>
							)}

							{demoFailed && (
								<button
									type="button"
									onClick={handleDemoTapToPlay}
									className="absolute inset-0 z-[3] flex items-center justify-center bg-slate-900/25 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
									aria-label="Play product demo"
								>
									<span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-800 shadow-md">
										Tap to play demo
									</span>
								</button>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-4 w-full">
							{HERO_TRUST_PILLARS.map((pillar) => (
								<article
									key={pillar.id}
									className="flex min-w-0 flex-col sm:flex-col gap-3 sm:gap-0 rounded-xl border border-slate-200/70 bg-white/70 p-3 sm:p-0 sm:border-0 sm:bg-transparent"
								>
									<div className="flex sm:block items-start gap-3">
										<div className="mb-0 sm:mb-3 h-20 w-28 shrink-0 sm:h-28 md:h-32 sm:w-full">
											<pillar.Visual animate={!reduceMotion} />
										</div>
										<div className="min-w-0 flex-1">
											<h3 className="text-sm font-semibold leading-snug sidebar-gradient-text">
												{pillar.title}
											</h3>
											<p className="mt-1 text-xs sm:text-xs leading-snug text-slate-600">
												{pillar.description}
											</p>
										</div>
									</div>
								</article>
							))}
						</div>
					</motion.div>

					{/* Quote — after demo on mobile; under copy on desktop */}
					<motion.div
						variants={fadeUp}
						initial="hidden"
						animate="visible"
						className="order-3 mt-0 max-w-md mx-auto lg:mx-0 rounded-xl bg-white/80 p-4 shadow-[0_1px_2px_0_rgba(15,23,42,0.06)] w-full"
					>
						<p className="text-slate-800 text-base italic">
							&ldquo;I use CAALM every day to keep all our contracts and
							compliance documents organized. It&rsquo;s so helpful, our team
							never misses a deadline or audit anymore!&rdquo;
						</p>
						<div className="mt-2 flex items-center gap-2">
							<Image
								src="/assets/images/review-avatar.jpg"
								alt="Priya Sharma"
								width={32}
								height={32}
								className="h-8 w-8 rounded-full"
								loading="lazy"
								sizes="32px"
							/>
							<div>
								<p className="text-sm font-semibold text-slate-800">
									Priya Sharma
								</p>
								<p className="text-xs text-slate-500">
									Director of Human Resources at Growthspark
								</p>
							</div>
						</div>
					</motion.div>
				</div>
			</div>

			<div className="section-fade-bottom" aria-hidden />
		</section>
	);
}
