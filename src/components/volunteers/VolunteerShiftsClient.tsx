"use client";

import { CalendarPlus, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { VolunteerShiftBooking } from "@/lib/volunteers/types";
import type { VolunteerShiftEvent } from "@/lib/volunteers/volunteer-shifts.service";

export function VolunteerShiftsClient() {
	const { permissions } = usePermissions();
	const { toast } = useToast();
	const canManage = permissions.includes(PERMISSIONS.VOLUNTEERS.MANAGE);
	const [shifts, setShifts] = useState<VolunteerShiftEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [bookings, setBookings] = useState<VolunteerShiftBooking[]>([]);
	const [constituentId, setConstituentId] = useState("");
	const [newTitle, setNewTitle] = useState("");
	const [newDate, setNewDate] = useState("");
	const [newCapacity, setNewCapacity] = useState("10");

	const loadShifts = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/volunteers/shifts");
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Could not load shifts");
			setShifts(body.items || []);
		} catch (error) {
			toast({
				title: "Could not load shifts",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [toast]);

	const loadBookings = useCallback(
		async (eventId: string) => {
			try {
				const res = await fetch(
					`/api/volunteers/shifts/${encodeURIComponent(eventId)}/bookings`,
				);
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || "Could not load bookings");
				setBookings(body.items || []);
			} catch (error) {
				toast({
					title: "Could not load bookings",
					description: error instanceof Error ? error.message : "Try again",
					variant: "destructive",
				});
			}
		},
		[toast],
	);

	useEffect(() => {
		void loadShifts();
	}, [loadShifts]);

	useEffect(() => {
		if (selectedId) void loadBookings(selectedId);
	}, [selectedId, loadBookings]);

	const createShift = async () => {
		try {
			const res = await fetch("/api/volunteers/shifts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: newTitle,
					startDate: newDate,
					shiftCapacity: Number(newCapacity),
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Create failed");
			setNewTitle("");
			setNewDate("");
			await loadShifts();
			toast({ title: "Volunteer shift created" });
		} catch (error) {
			toast({
				title: "Create failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		}
	};

	const book = async () => {
		if (!selectedId || !constituentId.trim()) return;
		try {
			const res = await fetch(
				`/api/volunteers/shifts/${encodeURIComponent(selectedId)}/bookings`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ constituentId: constituentId.trim() }),
				},
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Booking failed");
			setConstituentId("");
			await loadBookings(selectedId);
			toast({
				title:
					body.booking?.status === "waitlist"
						? "Added to waitlist"
						: "Volunteer booked",
			});
		} catch (error) {
			toast({
				title: "Booking failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		}
	};

	const promote = async (bookingId: string) => {
		if (!selectedId) return;
		try {
			const res = await fetch(
				`/api/volunteers/shifts/${encodeURIComponent(selectedId)}/bookings/${encodeURIComponent(bookingId)}/promote`,
				{ method: "POST" },
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Promotion failed");
			await loadBookings(selectedId);
			toast({ title: "Waitlist volunteer promoted" });
		} catch (error) {
			toast({
				title: "Promotion failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		}
	};

	const selected = shifts.find((s) => s.$id === selectedId);

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<p className="text-sm font-medium sidebar-gradient-text">Shifts</p>
					{loading ? (
						<p className="text-sm text-slate-600">Loading…</p>
					) : shifts.length === 0 ? (
						<p className="text-sm text-slate-600">No volunteer shifts yet.</p>
					) : (
						<ul className="space-y-2">
							{shifts.map((shift) => (
								<li key={shift.$id}>
									<button
										type="button"
										className={`w-full rounded-lg border p-3 text-left transition-all duration-200 cursor-pointer ${
											selectedId === shift.$id
												? "border-blue-300 bg-blue-50"
												: "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
										}`}
										onClick={() => setSelectedId(shift.$id)}
									>
										<p className="text-sm font-medium text-slate-700">
											{shift.title}
										</p>
										<p className="text-xs text-slate-600">
											{shift.startDate} · capacity {shift.shiftCapacity}
										</p>
									</button>
								</li>
							))}
						</ul>
					)}
					{canManage ? (
						<div className="space-y-3 border-t border-slate-200 pt-4">
							<Label>New shift</Label>
							<Input
								className="border-[0.25px] border-slate-300"
								placeholder="Title"
								value={newTitle}
								onChange={(e) => setNewTitle(e.target.value)}
							/>
							<Input
								type="date"
								className="border-[0.25px] border-slate-300"
								value={newDate}
								onChange={(e) => setNewDate(e.target.value)}
							/>
							<Input
								type="number"
								min={1}
								className="border-[0.25px] border-slate-300"
								value={newCapacity}
								onChange={(e) => setNewCapacity(e.target.value)}
							/>
							<div className="flex justify-end">
								<Button
									className="primary-btn px-3 sm:px-4"
									onClick={() => void createShift()}
								>
									<CalendarPlus className="h-4 w-4" />
									Create shift
								</Button>
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<p className="text-sm font-medium sidebar-gradient-text">
						Shift detail
					</p>
					{!selected ? (
						<p className="text-sm text-slate-600">Select a shift.</p>
					) : (
						<>
							<p className="text-sm text-slate-700">{selected.title}</p>
							{canManage ? (
								<div className="flex flex-wrap items-end gap-3">
									<div className="flex-1 min-w-[200px] space-y-1">
										<Label>Constituent ID</Label>
										<Input
											className="border-[0.25px] border-slate-300"
											value={constituentId}
											onChange={(e) => setConstituentId(e.target.value)}
										/>
									</div>
									<Button
										className="primary-btn px-3 sm:px-4"
										onClick={() => void book()}
									>
										<UserPlus className="h-4 w-4" />
										Book
									</Button>
								</div>
							) : null}
							<ul className="space-y-2">
								{bookings.map((b) => (
									<li
										key={b.$id}
										className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
									>
										<div>
											<p className="text-sm text-slate-700">
												{b.constituentId}
											</p>
											<span
												className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${
													b.status === "confirmed"
														? "bg-green/10 text-green border-green/20"
														: "bg-orange/10 text-orange border-orange/20"
												}`}
											>
												{b.status === "confirmed" ? "Confirmed" : "Waitlist"}
											</span>
										</div>
										{canManage && b.status === "waitlist" ? (
											<Button
												variant="outline"
												className="px-3"
												onClick={() => void promote(b.$id)}
											>
												Promote
											</Button>
										) : null}
									</li>
								))}
							</ul>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
