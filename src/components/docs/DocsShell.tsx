"use client";

import { DocsSearch } from "@/components/docs/DocsSearch";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import {
	DocsThemeProvider,
	DocsThemeToggle,
} from "@/components/docs/DocsTheme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function DocsHeader() {
	const [open, setOpen] = useState(false);

	return (
		<header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
			<div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-2 lg:hidden">
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9 border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
								aria-label="Open docs menu"
							>
								<Menu className="h-4 w-4" />
							</Button>
						</SheetTrigger>
						<SheetContent
							side="left"
							className="w-[300px] overflow-y-auto border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
						>
							<DocsSidebar onNavigate={() => setOpen(false)} />
						</SheetContent>
					</Sheet>
				</div>

				<Link href="/docs" className="flex shrink-0 items-center gap-2">
					<span className="relative h-7 w-7">
						<Image
							src="/assets/images/logo.svg"
							alt="CAALM"
							fill
							className="object-contain dark:brightness-0 dark:invert"
						/>
					</span>
					<span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
						CAALM Docs
					</span>
				</Link>

				<div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
					<div className="hidden w-full max-w-sm sm:block">
						<DocsSearch />
					</div>
					<DocsThemeToggle />
					<Link
						href="/sign-in"
						className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline dark:text-slate-400 dark:hover:text-slate-100"
					>
						Sign in
					</Link>
					<Link
						href="/try"
						className="inline-flex h-9 items-center rounded-lg bg-[#0f5384] px-3 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-90"
					>
						Try demo
					</Link>
				</div>
			</div>
			<div className="border-t border-slate-100 px-4 py-2 sm:hidden dark:border-slate-800">
				<DocsSearch />
			</div>
		</header>
	);
}

export function DocsShell({ children }: { children: React.ReactNode }) {
	return (
		<DocsThemeProvider>
			<div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(15,83,132,0.06),_transparent_55%),linear-gradient(to_bottom,#ffffff,#f8fafc)] text-slate-900 dark:bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.08),_transparent_50%),linear-gradient(to_bottom,#020617,#0f172a)] dark:text-slate-100">
				<DocsHeader />
				<div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-0 px-4 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 lg:px-8 xl:grid-cols-[260px_minmax(0,1fr)]">
					<aside className="hidden max-h-[calc(100vh-3.5rem)] overflow-y-auto py-8 lg:sticky lg:top-14 lg:block">
						<DocsSidebar />
					</aside>
					<div className="min-w-0 py-8">{children}</div>
				</div>
			</div>
		</DocsThemeProvider>
	);
}
