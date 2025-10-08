'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CalendarClock, Timer } from 'lucide-react';
import { tablesDB } from '@/lib/appwrite/client';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'appwrite';

interface RawContractRow {
	$id?: string;
	contractName?: string;
	name?: string;
	contractExpiryDate?: string;
	expiryDate?: string;
	status?: string;
}

interface ContractItem {
	id: string;
	name: string;
	expiryISO: string;
}

interface ContractExpiryAlertsProps {
	maxItems?: number;
	thresholdDays?: number; // show only items expiring within this window
	refreshMinutes?: number; // data refresh cadence
}

type UpcomingItem = ContractItem & { msLeft: number };

function getExpiryISO(row: RawContractRow): string | null {
	if (typeof row.contractExpiryDate === 'string' && row.contractExpiryDate)
		return row.contractExpiryDate;
	if (typeof row.expiryDate === 'string' && row.expiryDate) return row.expiryDate;
	return null;
}

function getName(row: RawContractRow): string {
	if (typeof row.contractName === 'string' && row.contractName) return row.contractName;
	if (typeof row.name === 'string' && row.name) return row.name;
	return 'Contract';
}

function msUntil(dateISO: string): number {
	const target = new Date(dateISO).getTime();
	const now = Date.now();
	return Math.max(0, target - now);
}

function formatCountdown(ms: number): { d: number; h: number; m: number; s: number } {
	const totalSeconds = Math.floor(ms / 1000);
	const d = Math.floor(totalSeconds / 86400);
	const h = Math.floor((totalSeconds % 86400) / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	return { d, h, m, s };
}

function clamp01(x: number): number {
	return Math.min(1, Math.max(0, x));
}

const ContractExpiryAlerts: React.FC<ContractExpiryAlertsProps> = ({
	maxItems = 4,
	thresholdDays = 30,
	refreshMinutes = 15,
}) => {
	const [items, setItems] = useState<ContractItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [now, setNow] = useState<number>(Date.now());
	const mounted = useRef(true);

	const load = useCallback(async () => {
		try {
			setError(null);
			// Query rows with an expiry date, soonest first
			const res = await tablesDB.listRows(
				appwriteConfig.databaseId,
				appwriteConfig.contractsCollectionId,
				[
					Query.isNotNull('contractExpiryDate'),
					Query.orderAsc('contractExpiryDate'),
					Query.limit(200),
				]
			);
			const rows: RawContractRow[] = (res?.rows as unknown as RawContractRow[]) || [];
			const mapped: ContractItem[] = rows
				.map((r) => {
					const id = typeof r.$id === 'string' ? r.$id : String(r.$id ?? '');
					const name = getName(r);
					const expiryISO = getExpiryISO(r);
					return expiryISO ? { id, name, expiryISO } : null;
				})
				.filter((x): x is ContractItem => !!x);

			if (!mounted.current) return;
			setItems(mapped);
		} catch (e) {
			if (!mounted.current) return;
			setError('Failed to load expirations');
		} finally {
			if (mounted.current) setLoading(false);
		}
	}, []);

	useEffect(() => {
		mounted.current = true;
		load();
		const refreshMs = Math.max(1, refreshMinutes) * 60 * 1000;
		const refreshTimer = setInterval(load, refreshMs);
		const tick = setInterval(() => setNow(Date.now()), 1000);
		return () => {
			mounted.current = false;
			clearInterval(refreshTimer);
			clearInterval(tick);
		};
	}, [load, refreshMinutes]);

	const upcoming: UpcomingItem[] = useMemo(() => {
		const windowMs = thresholdDays * 24 * 60 * 60 * 1000;
		return items
			.map((it: ContractItem) => ({
				...it,
				msLeft: msUntil(it.expiryISO),
			}))
			.filter((it: UpcomingItem) => it.msLeft <= windowMs && it.msLeft > 0)
			.sort((a: UpcomingItem, b: UpcomingItem) => a.msLeft - b.msLeft)
			.slice(0, maxItems);
	}, [items, thresholdDays, maxItems, now]);

	return (
		<Card className="w-[240px] bg-white/30 backdrop-blur border border-white/40 shadow-lg overflow-hidden">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-sm font-semibold sidebar-gradient-text">
						<Timer className="h-4 w-4" />
						Contract Expiry Alerts
					</CardTitle>
					{!loading && (
						<span className="text-[10px] text-slate-600">{upcoming.length} due</span>
					)}
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				{loading ? (
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<div key={i} className="border border-border rounded-lg p-3">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
									<div className="flex-1">
										<div className="h-3 bg-slate-200 rounded w-3/4 mb-2 animate-pulse" />
										<div className="h-2.5 bg-slate-200 rounded w-1/2 animate-pulse" />
									</div>
								</div>
							</div>
						))}
					</div>
				) : error ? (
					<div className="text-xs text-red-600 flex items-center gap-2">
						<AlertTriangle className="h-4 w-4" /> {error}
					</div>
				) : upcoming.length === 0 ? (
					<div className="text-xs text-slate-600 flex items-center gap-2">
						<CalendarClock className="h-4 w-4" /> Nothing expiring soon
					</div>
				) : (
					<div className="space-y-3">
						{upcoming.map((it: UpcomingItem) => {
							const windowMs = thresholdDays * 24 * 60 * 60 * 1000;
							const progress = clamp01(1 - it.msLeft / windowMs);
							const { d, h, m, s } = formatCountdown(it.msLeft);
							const hue = progress < 0.5 ? 45 : progress < 0.8 ? 25 : 0; // yellow to orange to red
							const pct = Math.round(progress * 100);
							return (
								<div key={it.id} className="border border-border rounded-lg p-3 hover:bg-white/40 transition-colors">
									<div className="flex items-center gap-3">
										<div
											className="relative h-12 w-12 rounded-full grid place-items-center shrink-0"
											style={{
												background: `conic-gradient(hsl(${hue} 90% 50%) ${pct}%, rgba(226,232,240,0.9) ${pct}%)`,
											}}
										>
											<div className="absolute inset-1 rounded-full bg-white" />
											<div className="relative text-[10px] font-semibold text-slate-700">
												{d > 0 ? `${d}d` : `${h}h`}
											</div>
										</div>
										<div className="min-w-0 flex-1">
											<div className="text-sm font-medium text-slate-800 truncate">
												{it.name}
											</div>
											<div className="text-[11px] text-slate-600">
												Expires {new Date(it.expiryISO).toLocaleDateString()}
											</div>
										</div>
										<div className="text-[10px] text-slate-600 text-right w-16">
											{d}d {h}h
											<div className="text-[10px] opacity-70">{m}m {s}s</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default ContractExpiryAlerts;

