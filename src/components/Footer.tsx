"use client";

import { Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import FooterMarquee from "./landing/FooterMarquee";

const Footer = () => {
	const [email, setEmail] = useState("");

	return (
		<footer id="footer" className="text-slate-700 relative">
			<FooterMarquee />

			<div className="container mx-auto px-4 py-8 sm:py-10 md:py-12 lg:py-16 md:px-6">
				<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
					<div className="lg:col-span-3">
						<div className="flex items-center">
							<div className="relative h-7 w-7 shrink-0 sm:h-8 sm:w-8">
								<Image
									src="/assets/images/logo.svg"
									alt="CAALM Logo"
									fill
									className="object-contain"
								/>
							</div>
							<span className="ml-2 text-lg sm:text-xl font-bold">CAALM</span>
						</div>
						<p className="mt-3 sm:mt-4 text-slate-light text-sm sm:text-base">
							Automated data & document management for modern compliance teams.
						</p>
					</div>

					<div className="lg:col-span-2">
						<h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg sidebar-gradient-text">
							Product
						</h3>
						<ul className="space-y-1.5 sm:space-y-2 text-slate-light text-sm sm:text-base">
							<li>
								<a
									href="#features"
									className="hover:text-slate-900 transition-colors"
								>
									Features
								</a>
							</li>
							<li>
								<a
									href="#how-it-works"
									className="hover:text-slate-900 transition-colors"
								>
									How it works
								</a>
							</li>
							<li>
								<a
									href="#pricing"
									className="hover:text-slate-900 transition-colors"
								>
									Pricing
								</a>
							</li>
							<li>
								<a
									href="#faq"
									className="hover:text-slate-900 transition-colors"
								>
									FAQ
								</a>
							</li>
						</ul>
					</div>

					<div className="lg:col-span-2">
						<h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg sidebar-gradient-text">
							Legal
						</h3>
						<ul className="space-y-1.5 sm:space-y-2 text-slate-light text-sm sm:text-base">
							<li>
								<Link
									href="/terms"
									className="hover:text-slate-900 transition-colors"
								>
									Terms
								</Link>
							</li>
							<li>
								<Link
									href="/privacy"
									className="hover:text-slate-900 transition-colors"
								>
									Privacy
								</Link>
							</li>
						</ul>
					</div>

					<div className="sm:col-span-2 lg:col-span-5">
						<h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg sidebar-gradient-text">
							Stay in the loop
						</h3>
						<p className="text-slate-light text-sm mb-3">
							Be first to know what&apos;s next
						</p>
						<form
							className="flex w-full max-w-[32rem] flex-col gap-2 sm:flex-row sm:items-stretch"
							onSubmit={(e) => {
								e.preventDefault();
								window.location.href = `mailto:support@caalmsolutions.com?subject=Newsletter signup&body=${encodeURIComponent(email)}`;
							}}
						>
							<label htmlFor="footer-email" className="sr-only">
								Email
							</label>
							<input
								id="footer-email"
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@company.com"
								className="w-full min-w-0 flex-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5384]/40 sm:max-w-[16rem]"
							/>
							<Button
								type="submit"
								className="primary-btn w-full cursor-pointer px-4 py-2.5 sm:w-auto sm:shrink-0 sm:px-5"
							>
								Subscribe
							</Button>
						</form>
						<div className="mt-4 flex items-center gap-2 text-slate-light">
							<Mail
								className="h-4 w-4 text-slate-700"
								strokeWidth={2.25}
								aria-hidden
							/>
							<a
								href="mailto:support@caalmsolutions.com"
								className="text-xs sm:text-sm hover:text-slate-900"
							>
								support@caalmsolutions.com
							</a>
						</div>
					</div>
				</div>

				<div className="mt-8 border-t border-navy-dark pt-6 sm:pt-8 text-center text-slate-dark text-xs sm:text-sm">
					<p>© 2026 CAALM. All rights reserved.</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
