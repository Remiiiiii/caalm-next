"use client";

import { BookOpenCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PendingAck = {
	id: string;
	title: string;
	ackDueAt?: string;
};

export function NewsAckBanner() {
	const [pending, setPending] = useState<PendingAck[]>([]);

	useEffect(() => {
		void fetch("/api/news/acks")
			.then((response) => (response.ok ? response.json() : { pending: [] }))
			.then((data) => setPending(data.pending || []))
			.catch(() => setPending([]));
	}, []);

	if (pending.length === 0) return null;

	const item = pending[0];
	return (
		<Card className="glass-card mb-6">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6 flex items-center justify-between gap-4">
				<div>
					<p className="text-sm font-medium sidebar-gradient-text">
						Please acknowledge: {item.title}
					</p>
					<p className="text-xs text-slate-600 mt-1">
						This is a reminder only. You can keep reading the rest of the feed.
						{item.ackDueAt
							? ` Due ${new Date(item.ackDueAt).toLocaleDateString()}.`
							: ""}
					</p>
				</div>
				<Button
					className="btn-primary px-3 sm:px-4"
					onClick={async () => {
						await fetch("/api/news/acks", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ articleId: item.id }),
						});
						setPending((current) => current.filter((row) => row.id !== item.id));
					}}
				>
					<BookOpenCheck className="h-4 w-4" />
					I have read and understood
				</Button>
			</CardContent>
		</Card>
	);
}
