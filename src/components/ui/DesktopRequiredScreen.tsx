"use client";

import { Check, Copy, Monitor } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface DesktopRequiredScreenProps {
	pathname: string;
}

export function DesktopRequiredScreen({
	pathname,
}: DesktopRequiredScreenProps) {
	const { toast } = useToast();
	const [copied, setCopied] = useState(false);

	const copyLink = async () => {
		const href =
			typeof window !== "undefined"
				? window.location.href
				: pathname;
		try {
			await navigator.clipboard.writeText(href);
			setCopied(true);
			toast({
				title: "Link copied",
				description: "Open it on a laptop to continue.",
			});
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			toast({
				title: "Could not copy",
				description: "Select the address in your browser and copy it.",
				variant: "destructive",
			});
		}
	};

	return (
		<div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
			<Card className="glass-card w-full max-w-[600px]">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex items-start gap-3">
						<Monitor className="mt-0.5 h-5 w-5 shrink-0 text-[#0f5384]" />
						<div className="min-w-0 flex-1">
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								Open this page on a laptop
							</h2>
							<p className="mt-2 text-sm text-slate-600">
								This screen needs a wider view. Copy the link and finish the
								work on a desktop or laptop. Phones stay for approvals,
								tickets, and dashboard glance.{" "}
								<Link
									href="/docs/concepts/desktop-and-mobile"
									className="text-[#0f5384] underline-offset-2 hover:underline"
								>
									See what works on each device
								</Link>
								.
							</p>
							<p className="mt-3 break-all rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
								{pathname}
							</p>
							<div className="mt-4 flex flex-wrap items-center justify-end gap-2">
								<Button asChild className="primary-btn px-3 sm:px-4">
									<Link href="/dashboard">
										<Monitor className="h-4 w-4" />
										Go to dashboard
									</Link>
								</Button>
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4"
									onClick={() => void copyLink()}
								>
									{copied ? (
										<Check className="h-4 w-4" />
									) : (
										<Copy className="h-4 w-4" />
									)}
									Copy link
								</Button>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
