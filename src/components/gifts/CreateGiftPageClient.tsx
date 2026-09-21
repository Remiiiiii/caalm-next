"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { GIFT_METHODS } from "@/lib/gifts";

export function CreateGiftPageClient() {
	const router = useRouter();
	const [amount, setAmount] = useState("");
	const [giftDate, setGiftDate] = useState("");
	const [method, setMethod] = useState<string>(GIFT_METHODS[0]!);
	const [constituentId, setConstituentId] = useState("");
	const [anonymous, setAnonymous] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async () => {
		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/gifts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					amount: Number(amount),
					giftDate: new Date(giftDate).toISOString(),
					method,
					constituentId: constituentId.trim(),
					anonymous,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Could not save gift");
				return;
			}
			router.push(`/gifts/${data.$id}`);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4">
				<h1 className="h1 capitalize sidebar-gradient-text">New gift</h1>
			</div>
			<div className="mb-6 flex justify-end">
				<Button
					className="primary-btn px-3 sm:px-4"
					disabled={saving}
					onClick={() => void submit()}
				>
					<Save className="h-4 w-4" />
					Save draft
				</Button>
			</div>
			<Card className="glass-card max-w-2xl">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					{error ? <p className="text-sm text-red">{error}</p> : null}
					<label className="block text-sm text-slate-600">
						Constituent ID
						<Input
							className="mt-1 border-[0.25px] border-slate-300"
							value={constituentId}
							onChange={(e) => setConstituentId(e.target.value)}
							placeholder="Paste constituent record id"
						/>
					</label>
					<label className="block text-sm text-slate-600">
						Amount
						<Input
							className="mt-1 border-[0.25px] border-slate-300"
							type="number"
							min="0"
							step="0.01"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
						/>
					</label>
					<label className="block text-sm text-slate-600">
						Gift date
						<Input
							className="mt-1 border-[0.25px] border-slate-300"
							type="date"
							value={giftDate}
							onChange={(e) => setGiftDate(e.target.value)}
						/>
					</label>
					<label className="block text-sm text-slate-600">
						Method
						<Select value={method} onValueChange={setMethod}>
							<SelectTrigger className="mt-1 border-[0.25px] border-slate-300">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{GIFT_METHODS.map((m) => (
									<SelectItem key={m} value={m}>
										{m}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</label>
					<label className="flex items-center gap-2 text-sm text-slate-600">
						<input
							type="checkbox"
							checked={anonymous}
							onChange={(e) => setAnonymous(e.target.checked)}
						/>
						Anonymous gift
					</label>
				</CardContent>
			</Card>
		</div>
	);
}
