"use client";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
	{ href: "#features", label: "Features", hideBelowXl: false },
	{ href: "#how-it-works", label: "How it works", hideBelowXl: false },
	{ href: "#integrations", label: "Integrations", hideBelowXl: false },
	{ href: "#pricing", label: "Pricing", hideBelowXl: false },
	{ href: "/docs", label: "Docs", hideBelowXl: false },
	{ href: "#faq", label: "FAQ", hideBelowXl: false },
	{ href: "#contact", label: "Contact", hideBelowXl: true },
] as const;

const MOBILE_QUERY = "(max-width: 767px)";

const MOBILE_NAV_LEFT = [
	{ href: "#features", label: "Features" },
	{ href: "#how-it-works", label: "How it works" },
	{ href: "#integrations", label: "Integrations" },
	{ href: "#pricing", label: "Pricing" },
	{ href: "/docs", label: "Docs" },
	{ href: "#faq", label: "FAQ" },
	{ href: "#contact", label: "Contact" },
] as const;

const MOBILE_NAV_RIGHT = [
	{ href: "#about", label: "About us" },
	{ href: "#features", label: "Platform" },
	{ href: "/docs", label: "Docs" },
	{ href: "/privacy", label: "Privacy" },
	{ href: "/terms", label: "Terms" },
] as const;

export const Header = () => {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const headerRef = useRef(null);
	const [scrolled, setScrolled] = useState(false);
	// Mobile-first: assume narrow until matchMedia confirms desktop
	const [isMobile, setIsMobile] = useState(true);

	useEffect(() => {
		const mediaQuery = window.matchMedia(MOBILE_QUERY);
		const update = () => setIsMobile(mediaQuery.matches);
		update();
		mediaQuery.addEventListener("change", update);
		return () => mediaQuery.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		const el = window;
		let raf = 0;
		const readScroll = () => {
			const top = window.scrollY || document.documentElement.scrollTop || 0;
			setScrolled(top >= 64);
		};
		const onScroll: EventListener = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(readScroll);
		};
		const listenerOptions: AddEventListenerOptions = { passive: true };
		readScroll();
		el.addEventListener("scroll", onScroll, listenerOptions);
		return () => {
			cancelAnimationFrame(raf);
			el.removeEventListener("scroll", onScroll, listenerOptions);
		};
	}, []);

	const wrapperVariants = {
		// At top of page: transparent on desktop; frosted on mobile for contrast
		// After scroll: compact frosted pill (full-width bar on mobile)
		top: {
			width: "100%",
			height: 70,
			borderRadius: 0,
			marginTop: 0,
			boxShadow: "none",
			background: isMobile
				? "rgba(255, 255, 255, 0.92)"
				: "rgba(255, 255, 255, 0)",
			border: isMobile
				? "1px solid rgba(226, 232, 240, 0.8)"
				: "1px solid rgba(255, 255, 255, 0)",
			transition: { type: "spring" as const, stiffness: 260, damping: 28 },
		},
		scrolled: {
			width: isMobile ? "100%" : "min(920px, 88%)",
			height: 70,
			borderRadius: isMobile ? 0 : 24,
			marginTop: isMobile ? 0 : 16,
			boxShadow: isMobile
				? "0 1px 0 0 rgba(15, 23, 42, 0.06)"
				: "0 4px 32px 0 rgba(16,30,54,0.10), 0 1.5px 4px 0 rgba(16,30,54,0.03)",
			background: "rgba(255,255,255,0.94)",
			border: isMobile
				? "1px solid rgba(226, 232, 240, 0.9)"
				: "1px solid rgba(200,200,200,0.18)",
			transition: { type: "spring" as const, stiffness: 260, damping: 28 },
		},
	};

	useEffect(() => {
		if (!isOpen) return;
		function handleClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		}
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") setIsOpen(false);
		}
		document.addEventListener("mousedown", handleClick);
		document.addEventListener("keydown", handleKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("mousedown", handleClick);
			document.removeEventListener("keydown", handleKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [isOpen]);

	return (
		<motion.header
			ref={headerRef}
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				zIndex: 50,
				background: isMobile
					? "rgba(255, 255, 255, 0.92)"
					: "rgba(255, 255, 255, 0)",
			}}
			className="max-md:backdrop-blur-md"
		>
			<motion.div
				variants={wrapperVariants}
				initial={false}
				animate={scrolled ? "scrolled" : "top"}
				style={{
					marginLeft: "auto",
					marginRight: "auto",
					backdropFilter: "blur(16px)",
					WebkitBackdropFilter: "blur(16px)",
					display: "grid",
					gridTemplateColumns: "auto 1fr auto",
					alignItems: "center",
					columnGap: "1.25rem",
					padding: "0 1.5rem",
				}}
				className="transition-all duration-500"
			>
				<div className="flex items-center shrink-0 min-w-0">
					<Link href="/" className="flex items-center gap-1.5">
						<Image
							src="/assets/images/logo.svg"
							alt="Logo"
							width={40}
							height={40}
							className="h-auto w-9 shrink-0"
						/>
						<span
							className={cn(
								"font-bold text-slate-700 whitespace-nowrap",
								scrolled ? "text-lg" : "text-xl sm:text-2xl",
							)}
						>
							CAALM
						</span>
					</Link>
				</div>

				<nav className="hidden md:flex items-center justify-center gap-3 lg:gap-4 min-w-0 overflow-hidden">
					{NAV_LINKS.map((link) => (
						<a
							key={link.href}
							className={cn(
								"font-medium text-sm text-slate-700 hover:underline decoration-[#03AFBF] underline-offset-4 whitespace-nowrap shrink-0",
								link.hideBelowXl && "hidden xl:inline",
							)}
							href={link.href}
						>
							{link.label}
						</a>
					))}
				</nav>

				<div className="hidden md:flex items-center justify-end gap-2 shrink-0">
					<a href="#contact">
						<Button
							variant="outline"
							className="rounded-full border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300 text-sm cursor-pointer transition-all duration-200 whitespace-nowrap"
						>
							Contact Sales
						</Button>
					</a>
					<Link href="/sign-in">
						<Button className="primary-btn px-3 sm:px-4 text-sm cursor-pointer whitespace-nowrap">
							Sign In
						</Button>
					</Link>
				</div>

				<button
					type="button"
					className="group flex md:hidden items-center justify-center z-20 size-10 justify-self-end cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 focus-visible:ring-offset-2 rounded-md"
					onClick={() => setIsOpen((prevState) => !prevState)}
					aria-label={isOpen ? "Close menu" : "Open menu"}
					aria-expanded={isOpen}
				>
					{isOpen ? (
						<X className="h-5 w-5 text-slate-700" strokeWidth={2} />
					) : (
						<span
							className="grid grid-cols-3 gap-[3px] text-slate-400 transition-colors duration-200 group-hover:text-slate-600"
							aria-hidden
						>
							{Array.from({ length: 9 }).map((_, i) => (
								<span
									key={i}
									className="size-1 rounded-full bg-current"
								/>
							))}
						</span>
					)}
				</button>
			</motion.div>

			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-10 bg-slate-900/25 backdrop-blur-[2px] md:hidden"
						aria-hidden="true"
					/>
					<div
						ref={menuRef}
						className="fixed top-[4.75rem] left-4 right-4 z-20 md:hidden rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] animate-fadeIn"
						role="dialog"
						aria-modal="true"
						aria-label="Site navigation"
					>
						<div className="mb-8 flex items-center justify-between gap-3">
							<Link
								href="/"
								className="flex items-center gap-1.5 min-w-0"
								onClick={() => setIsOpen(false)}
							>
								<Image
									src="/assets/images/logo.svg"
									alt=""
									width={32}
									height={32}
									className="h-8 w-8 shrink-0"
								/>
								<span className="font-bold text-lg text-slate-800">CAALM</span>
							</Link>
							<a href="#contact" onClick={() => setIsOpen(false)}>
								<Button className="primary-btn rounded-full px-4 text-sm cursor-pointer whitespace-nowrap shadow-sm">
									Book a Call
								</Button>
							</a>
						</div>

						<nav className="grid grid-cols-2 gap-x-6 gap-y-5">
							<ul className="space-y-5">
								{MOBILE_NAV_LEFT.map((link) => (
									<li key={link.href}>
										<a
											href={link.href}
											className="text-[15px] font-medium text-slate-500 hover:text-slate-800 transition-colors duration-200"
											onClick={() => setIsOpen(false)}
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
							<ul className="space-y-5">
								{MOBILE_NAV_RIGHT.map((link) => (
									<li key={`${link.href}-${link.label}`}>
										{link.href.startsWith("/") ? (
											<Link
												href={link.href}
												className="text-[15px] font-medium text-slate-500 hover:text-slate-800 transition-colors duration-200"
												onClick={() => setIsOpen(false)}
											>
												{link.label}
											</Link>
										) : (
											<a
												href={link.href}
												className="text-[15px] font-medium text-slate-500 hover:text-slate-800 transition-colors duration-200"
												onClick={() => setIsOpen(false)}
											>
												{link.label}
											</a>
										)}
									</li>
								))}
							</ul>
						</nav>

						<div className="mt-10 flex items-center justify-end">
							<Link
								href="/sign-in"
								className="text-[15px] font-medium text-slate-500 hover:text-slate-800 transition-colors duration-200"
								onClick={() => setIsOpen(false)}
							>
								Sign In
							</Link>
						</div>
					</div>
				</>
			)}
		</motion.header>
	);
};

export default Header;
