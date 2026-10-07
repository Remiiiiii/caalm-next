"use client";

import { Check, FilePen, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type QueueItem = {
	id: string;
	title: string;
	excerpt?: string;
	canonicalUrl?: string;
	source?: string;
	date: string;
};

export function NewsReviewQueue() {
	const { toast } = useToast();
	const [items, setItems] = useState<QueueItem[]>([]);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const load = useCallback(async () => {
		const response = await fetch("/api/news/review-queue");
		if (!response.ok) return;
		const data = await response.json();
		setItems(data.items || []);
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const act = async (action: "approve" | "draft" | "dismiss", ids: string[]) => {
		const response = await fetch("/api/news/review-queue", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ids, action }),
		});
		if (!response.ok) {
			toast({
				title: "Queue action failed",
				variant: "destructive",
			});
			return;
		}
		setSelected(new Set());
		await load();
	};

	return (
		<div className="space-y-4">
			{selected.size > 0 && (
				<div className="flex items-center justify-end gap-3">
					<Button
						className="btn-primary px-3 sm:px-4"
						onClick={() => act("approve", [...selected])}
					>
						<Check className="h-4 w-4" />
						Approve selected
					</Button>
					<Button
						variant="outline"
						className="px-3 sm:px-4"
						onClick={() => act("draft", [...selected])}
					>
						<FilePen className="h-4 w-4" />
						Save as draft
					</Button>
				</div>
			)}
			{items.length === 0 && (
				<p className="text-sm text-slate-600">The review queue is empty.</p>
			)}
			{items.map((item) => (
				<Card key={item.id} className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-start justify-between gap-4">
							<label className="flex items-start gap-3 min-w-0">
								<input
									type="checkbox"
									checked={selected.has(item.id)}
									aria-label={`Select ${item.title}`}
									onChange={(event) => {
										const next = new Set(selected);
										if (event.target.checked) next.add(item.id);
										else next.delete(item.id);
										setSelected(next);
									}}
								/>
								<div className="min-w-0">
									<p className="text-sm font-medium text-slate-700">{item.title}</p>
									<p className="text-xs text-slate-500 mt-1">
										{item.source} · {new Date(item.date).toLocaleString()}
									</p>
									<p className="text-sm text-slate-600 mt-2 line-clamp-3">
										{item.excerpt}
									</p>
									{item.canonicalUrl ? (
										<a
											href={item.canonicalUrl}
											className="text-xs text-[#0f5384] mt-2 inline-block"
											target="_blank"
											rel="noreferrer"
										>
											Open source
										</a>
									) : null}
								</div>
							</label>
							<div className="flex flex-col gap-2">
								<Button
									className="btn-primary px-3 sm:px-4"
									onClick={() => act("approve", [item.id])}
								>
									<Check className="h-4 w-4" />
									Approve
								</Button>
								<Button
									variant="outline"
									className="px-3 sm:px-4"
									onClick={() => act("draft", [item.id])}
								>
									<FilePen className="h-4 w-4" />
									Draft
								</Button>
								<Button
									className="delete-btn px-3 sm:px-4"
									onClick={() => act("dismiss", [item.id])}
								>
									<Trash2 className="h-4 w-4" />
									Dismiss
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
