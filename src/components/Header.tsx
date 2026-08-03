"use client";
import { motion } from "framer-motion";
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
	{ href: "#faq", label: "FAQ", hideBelowXl: false },
	{ href: "#contact", label: "Contact", hideBelowXl: true },
] as const;

export const Header = () => {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const headerRef = useRef(null);
	const [scrolled, setScrolled] = useState(false);

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
		// At top of page: transparent + blur (original frosted glass bar)
		// After scroll: compact frosted pill
		top: {
			width: "100%",
			height: 70,
			borderRadius: 0,
			marginTop: 0,
			boxShadow: "none",
			background: "rgba(255, 255, 255, 0)",
			border: "1px solid rgba(255, 255, 255, 0)",
			transition: { type: "spring" as const, stiffness: 260, damping: 28 },
		},
		scrolled: {
			width: "min(920px, 88%)",
			height: 70,
			borderRadius: 24,
			marginTop: 16,
			boxShadow:
				"0 4px 32px 0 rgba(16,30,54,0.10), 0 1.5px 4px 0 rgba(16,30,54,0.03)",
			background: "rgba(255,255,255,0.85)",
			border: "1px solid rgba(200,200,200,0.18)",
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
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
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
				background: "rgba(255, 255, 255, 0)",
			}}
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
					className="flex md:hidden flex-col items-center justify-center border-2 rounded-full z-20 w-10 h-10 border-s4/25 justify-self-end focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors bg-white cursor-pointer"
					onClick={() => setIsOpen((prevState) => !prevState)}
					aria-label={isOpen ? "Close menu" : "Open menu"}
				>
					<span
						className={`block w-6 h-0.5 bg-navy rounded transition-all duration-300 ease-in-out ${
							isOpen ? "rotate-45 translate-y-1.5" : "-translate-y-1.5"
						}`}
					></span>
					<span
						className={`block w-6 h-0.5 bg-navy rounded transition-all duration-300 ease-in-out my-1 ${
							isOpen ? "opacity-0" : "opacity-100"
						}`}
					></span>
					<span
						className={`block w-6 h-0.5 bg-navy rounded transition-all duration-300 ease-in-out ${
							isOpen ? "-rotate-45 -translate-y-1.5" : "translate-y-1.5"
						}`}
					></span>
				</button>
			</motion.div>

			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-10 bg-black/30 backdrop-blur-sm"
						aria-hidden="true"
					></div>
					<div
						ref={menuRef}
						className="fixed top-16 left-0 right-0 z-20 md:hidden py-6 border-t border-border bg-white w-full px-6 shadow-xl animate-fadeIn"
					>
						<nav className="flex flex-col space-y-4 text-sm">
							{NAV_LINKS.map((link) => (
								<a
									key={link.href}
									href={link.href}
									className="text-navy font-medium"
									onClick={() => setIsOpen(false)}
								>
									{link.label}
								</a>
							))}
							<div className="flex flex-col space-y-2 pt-3">
								<Link href="/sign-in">
									<Button
										variant="ghost"
										className="justify-start text-navy hover:text-[#2563eb] hover:bg-[#2563eb] hover:bg-opacity-10 w-full"
										onClick={() => setIsOpen(false)}
									>
										Sign In
									</Button>
								</Link>
								<Link href="/sign-in">
									<Button
										className="justify-start primary-btn w-full"
										onClick={() => setIsOpen(false)}
									>
										Get Started
									</Button>
								</Link>
							</div>
						</nav>
					</div>
				</>
			)}
		</motion.header>
	);
};

export default Header;
