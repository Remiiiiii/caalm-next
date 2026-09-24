"use client";

import { Download, Loader2, Plus, Ticket } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type {
	EventRegistration,
	EventRegistrationStatus,
	EventTicketType,
} from "@/lib/events/types";
import { cn } from "@/lib/utils";

function registrationStatusBadge(status: EventRegistrationStatus, checkedInAt?: string) {
	if (checkedInAt) {
		return "bg-green/10 text-green border-green/20";
	}
	switch (status) {
		case "posted":
		case "confirmed":
			return "bg-blue/10 text-blue border-blue/20";
		case "draft":
			return "bg-orange/10 text-orange border-orange/20";
		case "checked_in":
			return "bg-green/10 text-green border-green/20";
		default:
			return "bg-slate-100 text-slate-600 border-slate-200";
	}
}

function registrationStatusLabel(
	status: EventRegistrationStatus,
	checkedInAt?: string,
): string {
	if (checkedInAt) return "Checked in";
	if (status === "draft") return "Draft";
	if (status === "posted") return "Posted";
	if (status === "confirmed") return "Confirmed";
	if (status === "checked_in") return "Checked in";
	return status;
}

type Props = {
	eventId: string;
};

export function EventRegistrationsPanel({ eventId }: Props) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(true);
	const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([]);
	const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
	const [ticketTypeId, setTicketTypeId] = useState("");
	const [guestEmail, setGuestEmail] = useState("");
	const [guestFirstName, setGuestFirstName] = useState("");
	const [guestLastName, setGuestLastName] = useState("");
	const [status, setStatus] = useState<EventRegistrationStatus>("draft");
	const [constituentId, setConstituentId] = useState("");
	const [donationAmount, setDonationAmount] = useState("");
	const [paymentSucceeded, setPaymentSucceeded] = useState(false);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [typesRes, regsRes] = await Promise.all([
				fetch(`/api/events/${encodeURIComponent(eventId)}/ticket-types`),
				fetch(`/api/events/${encodeURIComponent(eventId)}/registrations`),
			]);
			const typesBody = await typesRes.json().catch(() => ({}));
			const regsBody = await regsRes.json().catch(() => ({}));
			if (!typesRes.ok) throw new Error(typesBody.error || "Ticket types failed");
			if (!regsRes.ok) throw new Error(regsBody.error || "Registrations failed");
			setTicketTypes(typesBody.items || []);
			setRegistrations(regsBody.items || []);
			if (!ticketTypeId && typesBody.items?.[0]?.$id) {
				setTicketTypeId(typesBody.items[0].$id);
			}
		} catch (error) {
			toast({
				title: "Could not load registrations",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [eventId, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleCreate = async () => {
		if (!ticketTypeId) {
			toast({
				title: "Pick a ticket type",
				variant: "destructive",
			});
			return;
		}
		setSaving(true);
		try {
			const res = await fetch(
				`/api/events/${encodeURIComponent(eventId)}/registrations`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						ticketTypeId,
						status,
						constituentId: constituentId.trim() || undefined,
						guestEmail: guestEmail.trim() || undefined,
						guestFirstName: guestFirstName.trim() || undefined,
						guestLastName: guestLastName.trim() || undefined,
						donationAmount: donationAmount.trim()
							? Number(donationAmount)
							: undefined,
						paymentSucceeded: paymentSucceeded || undefined,
					}),
				},
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(body.error || "Create failed");
			}
			setGuestEmail("");
			setGuestFirstName("");
			setGuestLastName("");
			await load();
			toast({ title: "Registration saved" });
		} catch (error) {
			toast({
				title: "Could not save registration",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center gap-2 text-sm text-slate-600 py-8 justify-center">
				<Loader2 className="h-4 w-4 animate-spin" />
				Loading registrations…
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-lg p-4 border border-slate-200 space-y-4">
				<div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
					<Ticket className="h-4 w-4 text-[#0f5384]" />
					Add registration
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label>Ticket type</Label>
						<Select value={ticketTypeId} onValueChange={setTicketTypeId}>
							<SelectTrigger className="border-[0.25px] border-slate-300">
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								{ticketTypes.map((row) => (
									<SelectItem key={row.$id} value={row.$id}>
										{row.name} (cap {row.capacity})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Status</Label>
						<Select
							value={status}
							onValueChange={(v) => setStatus(v as EventRegistrationStatus)}
						>
							<SelectTrigger className="border-[0.25px] border-slate-300">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="posted">Posted</SelectItem>
								<SelectItem value="confirmed">Confirmed</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Guest email</Label>
						<Input
							className="border-[0.25px] border-slate-300"
							value={guestEmail}
							onChange={(e) => setGuestEmail(e.target.value)}
							placeholder="guest@example.org"
						/>
					</div>
					<div className="space-y-2">
						<Label>Constituent ID (required for donations)</Label>
						<Input
							className="border-[0.25px] border-slate-300"
							value={constituentId}
							onChange={(e) => setConstituentId(e.target.value)}
							placeholder="Constituent record ID"
						/>
					</div>
					<div className="space-y-2">
						<Label>Donation amount (USD)</Label>
						<Input
							className="border-[0.25px] border-slate-300"
							value={donationAmount}
							onChange={(e) => setDonationAmount(e.target.value)}
							placeholder="0"
							inputMode="decimal"
						/>
					</div>
					<div className="space-y-2">
						<Label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={paymentSucceeded}
								onChange={(e) => setPaymentSucceeded(e.target.checked)}
							/>
							Payment succeeded
						</Label>
					</div>
					<div className="space-y-2">
						<Label>Guest name</Label>
						<div className="flex gap-2">
							<Input
								className="border-[0.25px] border-slate-300"
								value={guestFirstName}
								onChange={(e) => setGuestFirstName(e.target.value)}
								placeholder="First"
							/>
							<Input
								className="border-[0.25px] border-slate-300"
								value={guestLastName}
								onChange={(e) => setGuestLastName(e.target.value)}
								placeholder="Last"
							/>
						</div>
					</div>
				</div>
				<div className="flex justify-end">
					<Button
						className="primary-btn px-3 sm:px-4"
						disabled={saving}
						onClick={() => void handleCreate()}
					>
						<Plus className="h-4 w-4" />
						Add registration
					</Button>
				</div>
			</div>

			<div className="flex justify-end mb-3">
				<Button
					variant="outline"
					className="px-3 sm:px-4"
					onClick={() => {
						window.location.href = `/api/events/${encodeURIComponent(eventId)}/registrations/export`;
					}}
				>
					<Download className="h-4 w-4" />
					Export roster CSV
				</Button>
			</div>

			<div className="space-y-3">
				{registrations.length === 0 ? (
					<p className="text-sm text-slate-600">No registrations yet.</p>
				) : (
					registrations.map((row) => (
						<div
							key={row.$id}
							className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
						>
							<div>
								<p className="text-sm font-medium text-slate-700">
									{row.guestFirstName || row.guestLastName
										? `${row.guestFirstName || ""} ${row.guestLastName || ""}`.trim()
										: row.guestEmail || "Guest"}
								</p>
								<p className="text-xs text-slate-500">
									{row.guestEmail || "No email"}
									{row.constituentId ? ` · constituent ${row.constituentId}` : ""}
								</p>
							</div>
							<span
								className={cn(
									"inline-block px-2 py-0.5 text-xs rounded-full font-medium border capitalize",
									registrationStatusBadge(row.status, row.checkedInAt),
								)}
							>
								{registrationStatusLabel(row.status, row.checkedInAt)}
							</span>
						</div>
					))
				)}
			</div>
		</div>
	);
}
