"use client";

import {
	Archive,
	ArchiveRestore,
	Building2,
	ChevronDown,
	ChevronRight,
	Network,
	Plus,
	RefreshCw,
	Wallet,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { PermissionGate } from "@/components/PermissionGate";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import type { CostCenter, OrgUnit } from "@/lib/database/schemas/org-units.schema";
import { fetcher } from "@/lib/swr-config";

type UnitsResponse = { success: boolean; data: { units: OrgUnit[] } };
type CostCentersResponse = {
	success: boolean;
	data: { costCenters: CostCenter[] };
};

const fieldBorder =
	"bg-white !border-[0.25px] !border-solid !border-slate-200 focus-visible:!border-[#078FAB]";

function slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function OrgStructureManager({
	orgId,
	canEdit,
	maxDepartments,
}: {
	orgId: string;
	canEdit: boolean;
	maxDepartments: number;
}) {
	const { toast } = useToast();
	const unitsUrl = `/api/org-units?orgId=${encodeURIComponent(orgId)}&includeInactive=true`;
	const costUrl = `/api/cost-centers?orgId=${encodeURIComponent(orgId)}&includeInactive=true`;

	const { data, isLoading, mutate } = useSWR<UnitsResponse>(unitsUrl, fetcher);
	const { data: costData, mutate: mutateCosts } = useSWR<CostCentersResponse>(
		costUrl,
		fetcher,
	);

	const units = data?.data?.units || [];
	const costCenters = costData?.data?.costCenters || [];

	const departments = useMemo(
		() =>
			units
				.filter((u) => u.type === "department")
				.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
		[units],
	);
	const childrenByParent = useMemo(() => {
		const map = new Map<string, OrgUnit[]>();
		for (const u of units) {
			if (!u.parentId) continue;
			const list = map.get(u.parentId) || [];
			list.push(u);
			map.set(u.parentId, list);
		}
		for (const list of map.values()) {
			list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
		}
		return map;
	}, [units]);

	const activeDepartmentCount = departments.filter((d) => d.active).length;

	const [deptName, setDeptName] = useState("");
	const [divName, setDivName] = useState("");
	const [parentDeptId, setParentDeptId] = useState("");
	const [ccCode, setCcCode] = useState("");
	const [ccName, setCcName] = useState("");
	const [busy, setBusy] = useState(false);
	/** Departments in this map are collapsed; missing = expanded by default. */
	const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>(
		{},
	);

	const toggleDept = useCallback((deptId: string) => {
		setCollapsedById((prev) => ({
			...prev,
			[deptId]: !prev[deptId],
		}));
	}, []);

	const seedDefaults = useCallback(async () => {
		setBusy(true);
		try {
			const res = await fetch("/api/org-units/seed", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orgId }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Seed failed");
			toast({
				title: "Org structure seeded",
				description: `Created ${body.data?.seed?.created ?? 0}, skipped ${body.data?.seed?.skipped ?? 0}. Backfilled ${body.data?.backfill?.updated ?? 0} users.`,
			});
			await mutate();
		} catch (error) {
			toast({
				title: "Seed failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	}, [orgId, mutate, toast]);

	const addDepartment = useCallback(async () => {
		if (!deptName.trim()) return;
		if (activeDepartmentCount >= maxDepartments) {
			toast({
				title: "Department limit reached",
				description: `This organization allows ${maxDepartments} active departments.`,
				variant: "destructive",
			});
			return;
		}
		setBusy(true);
		try {
			const code = slugify(deptName) || deptName.trim();
			const res = await fetch("/api/org-units", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgId,
					type: "department",
					code,
					name: deptName.trim(),
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Could not add department");
			setDeptName("");
			toast({ title: "Department added" });
			await mutate();
		} catch (error) {
			toast({
				title: "Could not add department",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	}, [deptName, activeDepartmentCount, maxDepartments, orgId, mutate, toast]);

	const addDivision = useCallback(async () => {
		if (!divName.trim() || !parentDeptId) return;
		setBusy(true);
		try {
			const code = slugify(divName) || divName.trim();
			const res = await fetch("/api/org-units", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgId,
					type: "division",
					code,
					name: divName.trim(),
					parentId: parentDeptId,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Could not add division");
			setDivName("");
			toast({ title: "Division added" });
			await mutate();
		} catch (error) {
			toast({
				title: "Could not add division",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	}, [divName, parentDeptId, orgId, mutate, toast]);

	const archiveUnit = useCallback(
		async (id: string) => {
			setBusy(true);
			try {
				const res = await fetch(`/api/org-units/${id}`, { method: "DELETE" });
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || "Could not archive");
				toast({ title: "Unit archived" });
				await mutate();
			} catch (error) {
				toast({
					title: "Could not archive",
					description: error instanceof Error ? error.message : "Try again",
					variant: "destructive",
				});
			} finally {
				setBusy(false);
			}
		},
		[mutate, toast],
	);

	const restoreUnit = useCallback(
		async (id: string) => {
			setBusy(true);
			try {
				const res = await fetch(`/api/org-units/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ active: true }),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || "Could not restore");
				toast({ title: "Unit restored" });
				await mutate();
			} catch (error) {
				toast({
					title: "Could not restore",
					description: error instanceof Error ? error.message : "Try again",
					variant: "destructive",
				});
			} finally {
				setBusy(false);
			}
		},
		[mutate, toast],
	);

	const restoreCostCenter = useCallback(
		async (id: string) => {
			setBusy(true);
			try {
				const res = await fetch(`/api/cost-centers/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ active: true }),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || "Could not restore");
				toast({ title: "Cost center restored" });
				await mutateCosts();
			} catch (error) {
				toast({
					title: "Could not restore",
					description: error instanceof Error ? error.message : "Try again",
					variant: "destructive",
				});
			} finally {
				setBusy(false);
			}
		},
		[mutateCosts, toast],
	);

	const addCostCenter = useCallback(async () => {
		if (!ccCode.trim() || !ccName.trim()) return;
		setBusy(true);
		try {
			const res = await fetch("/api/cost-centers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgId,
					code: ccCode.trim(),
					name: ccName.trim(),
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Could not add cost center");
			setCcCode("");
			setCcName("");
			toast({ title: "Cost center added" });
			await mutateCosts();
		} catch (error) {
			toast({
				title: "Could not add cost center",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
		}
	}, [ccCode, ccName, orgId, mutateCosts, toast]);

	if (isLoading) {
		return <p className="text-sm text-slate-600">Loading org structure…</p>;
	}

	return (
		<div className="space-y-6">
			<GlassCard className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 bg-slate-50 space-y-4">
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
						<div className="flex items-start gap-3">
							<Network className="h-5 w-5 text-[#0f5384] mt-0.5" />
							<div>
								<p className="text-sm font-medium sidebar-gradient-text">
									Org structure
								</p>
								<p className="text-xs text-slate-600 mt-1">
									Departments are parent groups. Divisions are programs under
									them. See{" "}
									<a
										href="/docs/reference/organization-settings"
										className="text-[#0f5384] underline cursor-pointer"
									>
										organization settings docs
									</a>{" "}
									for how to use this tab.
								</p>
							</div>
						</div>
						<PermissionGate permission={PERMISSIONS.SETTINGS.EDIT}>
							<Button
								type="button"
								variant="outline"
								className="primary-btn px-3 sm:px-4 cursor-pointer"
								disabled={busy}
								onClick={seedDefaults}
							>
								<RefreshCw className="h-4 w-4" />
								Seed defaults
							</Button>
						</PermissionGate>
					</div>

					{departments.length === 0 ? (
						<p className="text-sm text-slate-600" role="status">
							No org units yet. Seed defaults or add a department.
						</p>
					) : (
						<ul className="space-y-3">
							{departments.map((dept) => {
								const children = childrenByParent.get(dept.$id) || [];
								const hasChildren = children.length > 0;
								const isOpen = hasChildren && !collapsedById[dept.$id];

								return (
									<li
										key={dept.$id}
										className="rounded-md border border-slate-200 bg-white p-3"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2 min-w-0">
												{hasChildren ? (
													<button
														type="button"
														className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
														aria-expanded={isOpen}
														aria-label={
															isOpen
																? `Collapse ${dept.name}`
																: `Expand ${dept.name}`
														}
														onClick={() => toggleDept(dept.$id)}
													>
														{isOpen ? (
															<ChevronDown className="h-4 w-4" />
														) : (
															<ChevronRight className="h-4 w-4" />
														)}
													</button>
												) : (
													<span className="inline-block w-5 shrink-0" />
												)}
												<Building2 className="h-4 w-4 text-[#0f5384] shrink-0" />
												<div className="min-w-0">
													<p className="text-sm font-medium text-slate-700 truncate">
														{dept.name}
													</p>
												</div>
											</div>
											{canEdit ? (
												dept.active ? (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="cursor-pointer"
														disabled={busy}
														onClick={() => archiveUnit(dept.$id)}
														aria-label={`Archive ${dept.name}`}
														title="Archive: hide from pickers. Blocked if users still use this unit as primary."
													>
														<Archive className="h-4 w-4" />
													</Button>
												) : (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="cursor-pointer text-[#0f5384]"
														disabled={busy}
														onClick={() => restoreUnit(dept.$id)}
														aria-label={`Restore ${dept.name}`}
														title="Restore: show again in invite and user pickers."
													>
														<ArchiveRestore className="h-4 w-4" />
													</Button>
												)
											) : null}
										</div>
										{isOpen ? (
											<ul className="mt-2 ml-7 border-t border-slate-200">
												{children.map((child) => {
													return (
														<li
															key={child.$id}
															className="flex items-center justify-between gap-2 border-b border-slate-200 py-2 text-sm text-slate-700 last:border-b-0"
														>
															<span className="truncate pl-1">{child.name}</span>
															{canEdit ? (
																child.active ? (
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		className="cursor-pointer"
																		disabled={busy}
																		onClick={() => archiveUnit(child.$id)}
																		aria-label={`Archive ${child.name}`}
																		title="Archive: hide from pickers. Blocked if users still use this unit as primary."
																	>
																		<Archive className="h-3.5 w-3.5" />
																	</Button>
																) : (
																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		className="cursor-pointer text-[#0f5384]"
																		disabled={busy}
																		onClick={() => restoreUnit(child.$id)}
																		aria-label={`Restore ${child.name}`}
																		title="Restore: show again in invite and user pickers."
																	>
																		<ArchiveRestore className="h-3.5 w-3.5" />
																	</Button>
																)
															) : null}
														</li>
													);
												})}
											</ul>
										) : null}
									</li>
								);
							})}
						</ul>
					)}

					{canEdit ? (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
							<div className="space-y-2">
								<Label htmlFor="new-dept">Add department</Label>
								<div className="flex gap-2">
									<Input
										id="new-dept"
										value={deptName}
										onChange={(e) => setDeptName(e.target.value)}
										placeholder="e.g. Facilities"
										className={fieldBorder}
									/>
									<Button
										type="button"
										className="primary-btn px-3 cursor-pointer shrink-0"
										disabled={busy || !deptName.trim()}
										onClick={addDepartment}
									>
										<Plus className="h-4 w-4" />
										Add
									</Button>
								</div>
								<p className="text-xs text-slate-500">
									{activeDepartmentCount}/{maxDepartments} active departments
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="new-div">Add division under department</Label>
								<Select value={parentDeptId} onValueChange={setParentDeptId}>
									<SelectTrigger
										id="new-div-parent"
										className={`${fieldBorder} cursor-pointer`}
									>
										<SelectValue placeholder="Parent department" />
									</SelectTrigger>
									<SelectContent>
										{departments
											.filter((d) => d.active)
											.map((d) => (
												<SelectItem key={d.$id} value={d.$id}>
													{d.name}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								<div className="flex gap-2">
									<Input
										id="new-div"
										value={divName}
										onChange={(e) => setDivName(e.target.value)}
										placeholder="e.g. North Clinic"
										className={fieldBorder}
									/>
									<Button
										type="button"
										className="primary-btn px-3 cursor-pointer shrink-0"
										disabled={busy || !divName.trim() || !parentDeptId}
										onClick={addDivision}
									>
										<Plus className="h-4 w-4" />
										Add
									</Button>
								</div>
							</div>
						</div>
					) : null}
				</CardContent>
			</GlassCard>

			<GlassCard className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 bg-slate-50 space-y-4">
					<div className="flex items-start gap-3">
						<Wallet className="h-5 w-5 text-[#0f5384] mt-0.5" />
						<div>
							<p className="text-sm font-medium sidebar-gradient-text">
								Cost centers
							</p>
							<p className="text-xs text-slate-600 mt-1">
								Finance codes separate from the people org chart.
							</p>
						</div>
					</div>
					<ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{costCenters.map((cc) => (
							<li
								key={cc.$id}
								className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm flex items-center justify-between gap-2"
							>
								<div className="min-w-0">
									<span className="font-medium text-slate-700">{cc.name}</span>
								</div>
								{canEdit && !cc.active ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="cursor-pointer text-[#0f5384] shrink-0"
										disabled={busy}
										onClick={() => restoreCostCenter(cc.$id)}
										aria-label={`Restore ${cc.name}`}
										title="Restore cost center"
									>
										<ArchiveRestore className="h-3.5 w-3.5" />
									</Button>
								) : null}
							</li>
						))}
						{costCenters.length === 0 ? (
							<li className="text-sm text-slate-600">No cost centers yet.</li>
						) : null}
					</ul>
					{canEdit ? (
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							<div className="space-y-1">
								<Label htmlFor="cc-code">Code</Label>
								<Input
									id="cc-code"
									value={ccCode}
									onChange={(e) => setCcCode(e.target.value)}
									className={fieldBorder}
								/>
							</div>
							<div className="space-y-1 sm:col-span-1">
								<Label htmlFor="cc-name">Name</Label>
								<Input
									id="cc-name"
									value={ccName}
									onChange={(e) => setCcName(e.target.value)}
									className={fieldBorder}
								/>
							</div>
							<div className="flex items-end">
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4 cursor-pointer w-full"
									disabled={busy || !ccCode.trim() || !ccName.trim()}
									onClick={addCostCenter}
								>
									<Plus className="h-4 w-4" />
									Add cost center
								</Button>
							</div>
						</div>
					) : null}
				</CardContent>
			</GlassCard>
		</div>
	);
}
