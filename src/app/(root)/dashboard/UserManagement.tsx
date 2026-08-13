"use client";

import {
	ArrowUpDown,
	Building2,
	CalendarClock,
	ChevronDown,
	ChevronsUpDown,
	Filter,
	FunnelX,
	KeyRound,
	LogOut,
	PencilIcon,
	Power,
	ShieldCheck,
	UserCheck,
	UserRound,
	UserX,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	AppDropdownMenuCheckboxItem,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
	DropdownMenu,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type UserActionKind,
	UserManagementActionDialogs,
} from "@/components/users/UserManagementActionDialogs";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { type UserManagementUser, useUsers } from "@/hooks/useUsers";
import {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn } from "@/lib/utils";
import { avatarPlaceholderUrl } from "../../../../constants";

const FILTER_SECTION_SCROLL =
	"max-h-36 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:thin]";

type DateRangeFilter = "all" | "today" | "last7days" | "last30days";

function isSafeNextImageSrc(src: string): boolean {
	const s = src.trim();
	if (!s) return false;
	if (/^https?:\/\//i.test(s)) return true;
	// Public folder paths must start with /
	if (s.startsWith("/") && !s.startsWith("//")) return true;
	return false;
}

function hasCustomAvatar(avatar: string | undefined): boolean {
	const a = avatar?.trim();
	if (!a) return false;
	if (!isSafeNextImageSrc(a)) return false;
	if (a === avatarPlaceholderUrl) return false;
	if (a.includes("avatar-placeholder")) return false;
	return true;
}

type SortKey =
	| "fullName"
	| "email"
	| "roleName"
	| "assignedByName"
	| "assignedDate"
	| "lastActiveAt";

type SortDirection = "asc" | "desc";

const formatDateTimeLabel = (iso?: string): string => {
	if (!iso) return "—";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";

	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterdayStart = new Date(todayStart);
	yesterdayStart.setDate(todayStart.getDate() - 1);
	const tomorrowStart = new Date(todayStart);
	tomorrowStart.setDate(todayStart.getDate() + 1);

	const timeLabel = date.toLocaleString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

	if (date >= todayStart && date < tomorrowStart) {
		return `Today at ${timeLabel}`;
	}
	if (date >= yesterdayStart && date < todayStart) {
		return `Yesterday at ${timeLabel}`;
	}

	const dateLabel = date.toLocaleDateString("en-US", {
		month: "short",
		day: "2-digit",
		year: "numeric",
	});

	return `${dateLabel} at ${timeLabel}`;
};

const UserManagement = () => {
	const { toast } = useToast();
	const { permissions } = usePermissions();
	const canManageUsers = permissions.includes(PERMISSIONS.USERS.EDIT);
	const canAssignRoles = permissions.includes(PERMISSIONS.USERS.ASSIGN_ROLES);

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
	const [selectedAssignedBy, setSelectedAssignedBy] = useState<string[]>([]);
	const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
	const [dateRangeFilter, setDateRangeFilter] =
		useState<DateRangeFilter>("all");
	const [sortConfig, setSortConfig] = useState<{
		key: SortKey;
		direction: SortDirection;
	}>({
		key: "fullName",
		direction: "asc",
	});

	const [actionUser, setActionUser] = useState<UserManagementUser | null>(null);
	const [actionKind, setActionKind] = useState<UserActionKind>(null);
	const [actionBusy, setActionBusy] = useState(false);
	const [orgRoleNames, setOrgRoleNames] = useState<string[]>([]);
	const [orgDepartmentNames, setOrgDepartmentNames] = useState<string[]>([]);

	const { orgId, loading: orgLoading } = useOrganization();
	const { users, isLoading, error, refresh } = useUsers({
		orgId,
		enableRealTime: true,
		pollingInterval: 15000,
	});
	const listLoading = orgLoading || !orgId || isLoading;

	useEffect(() => {
		let cancelled = false;
		const loadRoles = async () => {
			try {
				const res = await fetch("/api/admin/roles");
				if (!res.ok) return;
				const json = await res.json();
				const names = Array.isArray(json?.data)
					? json.data
							.map((r: { name?: string }) => String(r.name || "").trim())
							.filter(Boolean)
					: [];
				if (!cancelled) setOrgRoleNames(names);
			} catch {
				// Keep filter based on loaded users if roles API is unavailable
			}
		};
		void loadRoles();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!orgId) return;
		let cancelled = false;
		const loadDepartments = async () => {
			try {
				const res = await fetch(
					`/api/org-units?orgId=${encodeURIComponent(orgId)}`,
				);
				if (!res.ok) return;
				const json = await res.json();
				const units = json?.data?.units;
				if (!Array.isArray(units)) return;
				const names = [
					...new Set(
						units
							.filter(
								(u: { type?: string; active?: boolean }) =>
									u.type === "department" && u.active !== false,
							)
							.flatMap((u: { name?: string; code?: string }) =>
								[String(u.name || "").trim(), String(u.code || "").trim()].filter(
									Boolean,
								),
							),
					),
				];
				if (!cancelled) setOrgDepartmentNames(names);
			} catch {
				// Fall back to departments derived from loaded users
			}
		};
		void loadDepartments();
		return () => {
			cancelled = true;
		};
	}, [orgId]);

	const allRoles = useMemo(() => {
		const fromUsers = users.map((user) => user.roleName || "Unassigned");
		return [...new Set([...orgRoleNames, ...fromUsers])].sort((a, b) =>
			a.localeCompare(b),
		);
	}, [users, orgRoleNames]);

	const allAssigners = useMemo(
		() =>
			[
				...new Set([
					...users.map((user) => user.assignedByName || "System"),
					...selectedAssignedBy,
				]),
			].sort((a, b) => a.localeCompare(b)),
		[users, selectedAssignedBy],
	);

	const allDepartments = useMemo(() => {
		const fromUsers = users
			.map((user) => user.department?.trim() || "Unassigned")
			.filter(Boolean);
		return [...new Set([...orgDepartmentNames, ...fromUsers, "Unassigned"])].sort(
			(a, b) => {
				if (a === "Unassigned") return 1;
				if (b === "Unassigned") return -1;
				return a.localeCompare(b);
			},
		);
	}, [users, orgDepartmentNames]);

	const isWithinDateRange = (
		iso: string | undefined,
		range: DateRangeFilter,
	) => {
		if (range === "all") return true;
		if (!iso) return false;
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return false;

		const now = new Date();
		const startToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		if (range === "today") return date >= startToday;

		const days = range === "last7days" ? 7 : 30;
		const startWindow = new Date(now);
		startWindow.setDate(now.getDate() - days);
		return date >= startWindow;
	};

	const filteredAndSortedUsers = useMemo(() => {
		let next = users;

		if (searchTerm) {
			next = next.filter(
				(user) =>
					user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
					user.email.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}

		if (selectedRoles.length > 0) {
			next = next.filter((user) =>
				selectedRoles.includes(user.roleName || "Unassigned"),
			);
		}

		if (selectedAssignedBy.length > 0) {
			next = next.filter((user) =>
				selectedAssignedBy.includes(user.assignedByName || "System"),
			);
		}

		if (selectedDepartments.length > 0) {
			next = next.filter((user) =>
				selectedDepartments.includes(user.department?.trim() || "Unassigned"),
			);
		}

		next = next.filter((user) =>
			isWithinDateRange(user.assignedDate || user.$createdAt, dateRangeFilter),
		);

		return [...next].sort((a, b) => {
			const dir = sortConfig.direction === "asc" ? 1 : -1;
			const valueA = a[sortConfig.key];
			const valueB = b[sortConfig.key];

			if (
				sortConfig.key === "assignedDate" ||
				sortConfig.key === "lastActiveAt"
			) {
				const timeA = valueA ? new Date(String(valueA)).getTime() : 0;
				const timeB = valueB ? new Date(String(valueB)).getTime() : 0;
				return (timeA - timeB) * dir;
			}

			return String(valueA || "").localeCompare(String(valueB || "")) * dir;
		});
	}, [
		users,
		searchTerm,
		selectedRoles,
		selectedAssignedBy,
		selectedDepartments,
		dateRangeFilter,
		sortConfig,
	]);

	const activeFilterCount =
		selectedRoles.length +
		selectedAssignedBy.length +
		selectedDepartments.length +
		(dateRangeFilter === "all" ? 0 : 1);

	const clearAllFilters = () => {
		setSelectedRoles([]);
		setSelectedAssignedBy([]);
		setSelectedDepartments([]);
		setDateRangeFilter("all");
	};

	const toggleSort = (key: SortKey) => {
		setSortConfig((current) => ({
			key,
			direction:
				current.key === key && current.direction === "asc" ? "desc" : "asc",
		}));
	};

	const applySortPreset = (key: SortKey, direction: SortDirection) => {
		setSortConfig({ key, direction });
	};

	const openAction = (user: UserManagementUser, kind: UserActionKind) => {
		setActionUser(user);
		setActionKind(kind);
	};

	const closeAction = () => {
		setActionUser(null);
		setActionKind(null);
	};

	const runAction = async (
		fn: () => Promise<void>,
		successTitle: string,
		successDescription?: string,
	) => {
		setActionBusy(true);
		try {
			await fn();
			toast({
				title: successTitle,
				description: successDescription,
			});
			setActionUser(null);
			setActionKind(null);
			refresh();
		} catch (err) {
			toast({
				title: "Action failed",
				description: (err as Error).message || "Something went wrong",
				variant: "destructive",
			});
		} finally {
			setActionBusy(false);
		}
	};

	const renderSortableHead = (label: string, key: SortKey, className = "") => {
		const isActive = sortConfig.key === key;
		return (
			<TableHead className={cn(DATA_TABLE_HEADER_CELL, className)}>
				<Button
					type="button"
					variant="ghost"
					onClick={() => toggleSort(key)}
					className="h-auto px-0 py-0 font-semibold sidebar-gradient-text hover:bg-transparent hover:opacity-80"
				>
					{label}
					<ChevronsUpDown
						className={cn(
							"ml-1.5 h-3.5 w-3.5",
							isActive ? "text-[#0f5384] opacity-100" : "opacity-40",
						)}
					/>
				</Button>
			</TableHead>
		);
	};

	if (error) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-6">
					<div className="text-center text-red-600">
						<p>Failed to load users</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6">
			<div className="mb-4 flex w-full flex-col gap-1">
				<h1 className="h1 capitalize sidebar-gradient-text">User management</h1>
				<p className="text-sm text-slate-600">
					View and manage user accounts, roles, assignments, activity, and
					account actions in one place.
				</p>
			</div>

			<div className="flex items-center justify-end gap-2">
				<DropdownMenu>
					<AppDropdownMenuTrigger
						asChild
						className="border-0 bg-transparent p-0 shadow-none ring-0 hover:bg-transparent data-[state=open]:bg-transparent"
					>
						<Button
							variant="ghost"
							size="sm"
							className="primary-btn border-0 px-3 shadow-none focus-visible:ring-0 sm:px-4"
						>
							<Filter className="h-4 w-4" />
							<span className="hidden sm:inline">Filter</span>
							{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
							<ChevronDown className="h-4 w-4" />
						</Button>
					</AppDropdownMenuTrigger>
					<AppDropdownMenuContent align="end" className="w-72">
						<DropdownMenuLabel className="sidebar-gradient-text">
							Filter by role
						</DropdownMenuLabel>
						{allRoles.map((role) => (
							<AppDropdownMenuCheckboxItem
								icon={ShieldCheck}
								key={role}
								checked={selectedRoles.includes(role)}
								onCheckedChange={(checked) =>
									setSelectedRoles((prev) =>
										checked
											? [...prev, role]
											: prev.filter((r) => r !== role),
									)
								}
							>
								{role}
							</AppDropdownMenuCheckboxItem>
						))}

						<DropdownMenuSeparator />
						<DropdownMenuLabel className="sidebar-gradient-text">
							Filter by department
						</DropdownMenuLabel>
						<div className={FILTER_SECTION_SCROLL}>
							{allDepartments.map((department) => (
								<AppDropdownMenuCheckboxItem
									icon={Building2}
									key={department}
									checked={selectedDepartments.includes(department)}
									onCheckedChange={(checked) =>
										setSelectedDepartments((prev) =>
											checked
												? [...prev, department]
												: prev.filter((d) => d !== department),
										)
									}
								>
									{department}
								</AppDropdownMenuCheckboxItem>
							))}
						</div>

						<DropdownMenuSeparator />
						<DropdownMenuLabel className="sidebar-gradient-text">
							Filter by assigned by
						</DropdownMenuLabel>
						<div className={FILTER_SECTION_SCROLL}>
							{allAssigners.map((assigner) => (
								<AppDropdownMenuCheckboxItem
									icon={UserCheck}
									key={assigner}
									checked={selectedAssignedBy.includes(assigner)}
									onCheckedChange={(checked) =>
										setSelectedAssignedBy((prev) =>
											checked
												? [...prev, assigner]
												: prev.filter((v) => v !== assigner),
										)
									}
								>
									{assigner}
								</AppDropdownMenuCheckboxItem>
							))}
						</div>

						<DropdownMenuSeparator />
						<DropdownMenuLabel className="sidebar-gradient-text">
							Assigned date
						</DropdownMenuLabel>
						<AppDropdownMenuCheckboxItem
							icon={UserCheck}
							checked={dateRangeFilter === "today"}
							onCheckedChange={() => setDateRangeFilter("today")}
						>
							Today
						</AppDropdownMenuCheckboxItem>
						<AppDropdownMenuCheckboxItem
							icon={UserCheck}
							checked={dateRangeFilter === "last7days"}
							onCheckedChange={() => setDateRangeFilter("last7days")}
						>
							Last 7 days
						</AppDropdownMenuCheckboxItem>
						<AppDropdownMenuCheckboxItem
							icon={UserCheck}
							checked={dateRangeFilter === "last30days"}
							onCheckedChange={() => setDateRangeFilter("last30days")}
						>
							Last 30 days
						</AppDropdownMenuCheckboxItem>
						<AppDropdownMenuCheckboxItem
							icon={CalendarClock}
							checked={dateRangeFilter === "all"}
							onCheckedChange={() => setDateRangeFilter("all")}
						>
							All dates
						</AppDropdownMenuCheckboxItem>

						{activeFilterCount > 0 && (
							<>
								<DropdownMenuSeparator />
								<AppDropdownMenuItem
									icon={FunnelX}
									onSelect={(e) => {
										e.preventDefault();
										clearAllFilters();
									}}
								>
									Clear filters
								</AppDropdownMenuItem>
							</>
						)}
					</AppDropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<AppDropdownMenuTrigger
						asChild
						className="border-0 bg-transparent p-0 shadow-none ring-0 hover:bg-transparent data-[state=open]:bg-transparent"
					>
						<Button
							variant="ghost"
							size="sm"
							className="primary-btn border-0 px-3 shadow-none focus-visible:ring-0 sm:px-4"
						>
							<ArrowUpDown className="h-4 w-4" />
							<span className="hidden sm:inline">Sort by</span>
							<ChevronDown className="h-4 w-4" />
						</Button>
					</AppDropdownMenuTrigger>
					<AppDropdownMenuContent align="end" className="w-64">
						<AppDropdownMenuItem
							icon={ChevronsUpDown}
							onSelect={() => applySortPreset("fullName", "asc")}
						>
							Full Name (A-Z)
						</AppDropdownMenuItem>
						<AppDropdownMenuItem
							icon={ChevronsUpDown}
							onSelect={() => applySortPreset("fullName", "desc")}
						>
							Full Name (Z-A)
						</AppDropdownMenuItem>
						<AppDropdownMenuItem
							icon={ChevronsUpDown}
							onSelect={() => applySortPreset("email", "asc")}
						>
							Email (A-Z)
						</AppDropdownMenuItem>
						<AppDropdownMenuItem
							icon={ChevronsUpDown}
							onSelect={() => applySortPreset("email", "desc")}
						>
							Email (Z-A)
						</AppDropdownMenuItem>
						<DropdownMenuSeparator />
						<AppDropdownMenuItem
							icon={ChevronsUpDown}
							onSelect={() => applySortPreset("assignedDate", "desc")}
						>
							Assigned Date (Newest)
						</AppDropdownMenuItem>
						<AppDropdownMenuItem
							icon={ChevronsUpDown}
							onSelect={() => applySortPreset("assignedDate", "asc")}
						>
							Assigned Date (Oldest)
						</AppDropdownMenuItem>
						<DropdownMenuSeparator />
						<AppDropdownMenuItem
							icon={ChevronsUpDown}
							onSelect={() => applySortPreset("lastActiveAt", "desc")}
						>
							Last Active (Most recent)
						</AppDropdownMenuItem>
						<AppDropdownMenuItem
							icon={ChevronsUpDown}
							onSelect={() => applySortPreset("lastActiveAt", "asc")}
						>
							Last Active (Least recent)
						</AppDropdownMenuItem>
					</AppDropdownMenuContent>
				</DropdownMenu>
			</div>

			<Card className="glass-card w-full">
				<div className="glass-card-cap" />
				<CardContent className="p-0">
					<div className="px-4 pb-3 pt-6 sm:px-6 sm:pt-7">
						<Input
							placeholder="Search users by full name or email..."
							className="max-w-md border-slate-200 bg-white"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>

					{listLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="text-center">
								<div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
								<p className="mt-2 text-sm text-slate-600">Loading users...</p>
							</div>
						</div>
					) : (
						<div className="w-full overflow-x-auto px-2 pb-4 sm:px-4">
							<Table className="border-separate border-spacing-0">
								<TableHeader className="[&_tr]:border-b-0">
									<TableRow className={DATA_TABLE_HEADER_ROW}>
										{renderSortableHead("Full name", "fullName", "pl-4 pr-3")}
										{renderSortableHead(
											"Role / Dept · Division",
											"roleName",
											"px-3",
										)}
										{renderSortableHead(
											"Assigned by",
											"assignedByName",
											"px-3",
										)}
										{renderSortableHead(
											"Assigned date",
											"assignedDate",
											"px-3",
										)}
										{renderSortableHead("Last active", "lastActiveAt", "px-3")}
										<TableHead
											className={cn(
												DATA_TABLE_HEADER_CELL,
												"pl-3 pr-4 text-right",
											)}
										>
											<span className="sr-only">Action</span>
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody className="[&_tr:last-child>td]:border-b-0">
									{filteredAndSortedUsers.map((user) => {
										const department = user.department?.trim() || "—";
										const division = user.division?.trim() || "—";
										return (
											<TableRow
												key={user.$id}
												className={DATA_TABLE_BODY_ROW_BASE}
											>
												<TableCell className="py-3 pl-4 pr-3">
													<div className="flex min-w-55 items-center gap-2.5">
														{hasCustomAvatar(user.avatar) ? (
															<div
																className="h-7.5 w-7.5 shrink-0 overflow-hidden rounded-full"
																style={{
																	background:
																		"linear-gradient(135deg, #12477d 0%, #03afbf 100%)",
																	padding: "2px",
																}}
															>
																<Image
																	src={user.avatar!}
																	alt=""
																	width={26}
																	height={26}
																	className="h-6.5 w-6.5 rounded-full border-2 border-white object-cover"
																/>
															</div>
														) : (
															<Avatar
																name={user.fullName}
																userId={user.$id}
																size="sm"
																className="shrink-0 gap-0"
															/>
														)}
														<div className="min-w-0">
															<p className="truncate text-sm font-semibold text-slate-700">
																{user.fullName}
															</p>
															<p className="truncate text-sm text-slate-600">
																{user.email}
															</p>
														</div>
													</div>
												</TableCell>
												<TableCell className="px-3 py-3">
													<div className="min-w-0">
														<p className="truncate text-sm font-semibold text-slate-700">
															{user.roleName || "Unassigned"}
														</p>
														<p className="mt-0.5 truncate text-xs text-slate-500">
															{department} · {division}
														</p>
													</div>
												</TableCell>
												<TableCell className="px-3 py-3">
													<span className="text-sm text-slate-600">
														{user.assignedByName || "System"}
													</span>
												</TableCell>
												<TableCell className="whitespace-nowrap px-3 py-3">
													<span className="text-sm tabular-nums text-slate-600">
														{formatDateTimeLabel(
															user.assignedDate || user.$createdAt,
														)}
													</span>
												</TableCell>
												<TableCell className="whitespace-nowrap px-3 py-3">
													<span className="text-sm tabular-nums text-slate-600">
														{formatDateTimeLabel(
															user.lastActiveAt || user.$updatedAt,
														)}
													</span>
												</TableCell>
												<TableCell className="py-3 pr-4 pl-3 text-right">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="ml-auto h-8 w-8 shad-no-focus border-0 bg-transparent p-0 shadow-none text-slate-500 hover:bg-transparent hover:text-[#0f5384] focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
																aria-label={`Actions for ${user.fullName}`}
															>
																<Image
																	src="/assets/icons/dots.svg"
																	alt=""
																	width={24}
																	height={24}
																	className="h-6 w-6"
																/>
															</Button>
														</DropdownMenuTrigger>
														<AppDropdownMenuContent
															align="end"
															className="min-w-[230px]"
														>
															<AppDropdownMenuItem
																icon={UserRound}
																onSelect={() => openAction(user, "view")}
															>
																View profile
															</AppDropdownMenuItem>
															<AppDropdownMenuItem
																icon={PencilIcon}
																disabled={!canManageUsers}
																onSelect={() => openAction(user, "edit")}
															>
																Edit user details
															</AppDropdownMenuItem>
															<AppDropdownMenuItem
																icon={ShieldCheck}
																disabled={!canAssignRoles}
																onSelect={() => openAction(user, "role")}
															>
																Change role
															</AppDropdownMenuItem>
															<DropdownMenuSeparator />
															<AppDropdownMenuItem
																icon={KeyRound}
																disabled={!canManageUsers}
																onSelect={() => openAction(user, "reset")}
															>
																Reset password
															</AppDropdownMenuItem>
															<AppDropdownMenuItem
																icon={LogOut}
																disabled={!canManageUsers}
																onSelect={() => openAction(user, "revoke")}
															>
																Revoke active sessions
															</AppDropdownMenuItem>
															<AppDropdownMenuItem
																icon={Power}
																disabled={!canManageUsers}
																onSelect={() => openAction(user, "suspend")}
															>
																Suspend / reactivate account
															</AppDropdownMenuItem>
															<DropdownMenuSeparator />
															<AppDropdownMenuItem
																icon={UserX}
																tone="danger"
																disabled={!canManageUsers}
																onSelect={() => openAction(user, "delete")}
															>
																Delete user
															</AppDropdownMenuItem>
														</AppDropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>

							{filteredAndSortedUsers.length === 0 && (
								<div className="text-center py-10 text-slate-500">
									<p className="body-2">
										No users match the current search or filters.
									</p>
									{activeFilterCount > 0 && (
										<Button
											variant="outline"
											size="sm"
											onClick={clearAllFilters}
											className="mt-3"
										>
											Clear filters
										</Button>
									)}
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			<UserManagementActionDialogs
				user={actionUser}
				action={actionKind}
				roleOptions={allRoles.filter((r) => r !== "Unassigned")}
				busy={actionBusy}
				onClose={closeAction}
				onSaveEdit={async ({
					fullName,
					department,
					division,
					managerUserId,
				}) => {
					if (!actionUser) return;
					await runAction(
						async () => {
							const res = await fetch("/api/user/update", {
								method: "PATCH",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									accountId: actionUser.accountId,
									fullName,
									department: department || undefined,
									division: division || undefined,
									managerUserId,
								}),
							});
							const data = await res.json().catch(() => ({}));
							if (!res.ok)
								throw new Error(data.error || "Failed to update user");
						},
						"User updated",
						`${fullName} was saved`,
					);
				}}
				onSaveRole={async (roleName) => {
					if (!actionUser) return;
					await runAction(
						async () => {
							const res = await fetch("/api/admin/set-user-role", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									email: actionUser.email,
									roleName,
									orgId,
								}),
							});
							const data = await res.json().catch(() => ({}));
							if (!res.ok)
								throw new Error(data.error || "Failed to change role");
						},
						"Role updated",
						`${actionUser.fullName} is now ${roleName}`,
					);
				}}
				onConfirmReset={async () => {
					if (!actionUser) return;
					await runAction(
						async () => {
							const res = await fetch(
								`/api/admin/users/${actionUser.$id}/reset-password`,
								{ method: "POST" },
							);
							const data = await res.json().catch(() => ({}));
							if (!res.ok)
								throw new Error(data.error || "Failed to send reset email");
						},
						"Password reset sent",
						dataMessage(actionUser.email),
					);
				}}
				onConfirmRevoke={async () => {
					if (!actionUser) return;
					await runAction(
						async () => {
							const res = await fetch(
								`/api/admin/users/${actionUser.$id}/revoke-sessions`,
								{ method: "POST" },
							);
							const data = await res.json().catch(() => ({}));
							if (!res.ok)
								throw new Error(data.error || "Failed to revoke sessions");
						},
						"Sessions revoked",
						`${actionUser.fullName} was signed out everywhere`,
					);
				}}
				onConfirmSuspend={async () => {
					if (!actionUser) return;
					const nextStatus =
						actionUser.status === "suspended" ||
						actionUser.status === "inactive"
							? "active"
							: "suspended";
					await runAction(
						async () => {
							const res = await fetch("/api/user/update", {
								method: "PATCH",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									accountId: actionUser.accountId,
									status: nextStatus,
								}),
							});
							const data = await res.json().catch(() => ({}));
							if (!res.ok)
								throw new Error(data.error || "Failed to update status");
						},
						nextStatus === "active"
							? "Account reactivated"
							: "Account suspended",
					);
				}}
				onConfirmDelete={async () => {
					if (!actionUser) return;
					await runAction(
						async () => {
							const res = await fetch(
								`/api/user/delete?userId=${encodeURIComponent(actionUser.$id)}`,
								{ method: "DELETE" },
							);
							const data = await res.json().catch(() => ({}));
							if (!res.ok)
								throw new Error(data.error || "Failed to delete user");
						},
						"User deleted",
						`${actionUser.fullName} was removed`,
					);
				}}
			/>
		</div>
	);
};

function dataMessage(email: string) {
	return `Check ${email} for the reset link`;
}

export default UserManagement;
