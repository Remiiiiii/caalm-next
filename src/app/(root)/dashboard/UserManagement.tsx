"use client";

import {
	Ban,
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
import { useMemo, useState } from "react";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
	AppDropdownMenuCheckboxItem,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
	DropdownMenu,
	DropdownMenuLabel,
	DropdownMenuSeparator,
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
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useUsers } from "@/hooks/useUsers";
import {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { avatarPlaceholderUrl } from "../../../../constants";

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
	const [dateRangeFilter, setDateRangeFilter] =
		useState<DateRangeFilter>("all");
	const [sortConfig, setSortConfig] = useState<{
		key: SortKey;
		direction: SortDirection;
	}>({
		key: "fullName",
		direction: "asc",
	});

	const [actionUserName, setActionUserName] = useState<string | null>(null);
	const [actionLabel, setActionLabel] = useState<string | null>(null);

	const { orgId, loading: orgLoading } = useOrganization();
	const { users, isLoading, error } = useUsers({
		orgId,
		enableRealTime: true,
		pollingInterval: 15000,
	});
	const listLoading = orgLoading || !orgId || isLoading;

	const allRoles = useMemo(
		() =>
			[...new Set(users.map((user) => user.roleName || "Unassigned"))].sort(
				(a, b) => a.localeCompare(b),
			),
		[users],
	);

	const allAssigners = useMemo(
		() =>
			[...new Set(users.map((user) => user.assignedByName || "System"))].sort(
				(a, b) => a.localeCompare(b),
			),
		[users],
	);

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
		dateRangeFilter,
		sortConfig,
	]);

	const activeFilterCount =
		selectedRoles.length +
		selectedAssignedBy.length +
		(dateRangeFilter === "all" ? 0 : 1);

	const clearAllFilters = () => {
		setSelectedRoles([]);
		setSelectedAssignedBy([]);
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

	const handleAction = (userName: string, label: string) => {
		setActionUserName(userName);
		setActionLabel(label);
		toast({
			title: "Action selected",
			description: `${label} for ${userName}`,
		});
	};

	const renderSortableHead = (label: string, key: SortKey, className = "") => {
		const isActive = sortConfig.key === key;
		return (
			<TableHead className={`${DATA_TABLE_HEADER_CELL} ${className}`}>
				<Button
					type="button"
					variant="ghost"
					onClick={() => toggleSort(key)}
					className="h-auto px-0 py-0 font-semibold text-slate-700 hover:bg-transparent"
				>
					{label}
					<ChevronsUpDown
						className={`ml-1.5 h-3.5 w-3.5 ${isActive ? "opacity-100" : "opacity-50"}`}
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
			<div className="flex justify-between flex-col gap-3 sm:flex-row sm:items-center ">
				<Input
					placeholder="Search users by full name or email..."
					className="max-w-md border-white/40 bg-white/40"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex items-center gap-2">
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
									Filter by assigned by
								</DropdownMenuLabel>
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
				</div>
			</div>

			<Card className="w-full glass-card border border-white/40 bg-white/30 shadow-lg backdrop-blur">
				<div className="glass-card-cap" />
				<CardContent className="p-6 space-y-4">
					{listLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="text-center">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
								<p className="mt-2 text-sm text-gray-500">Loading users...</p>
							</div>
						</div>
					) : (
						<div className="w-full overflow-x-auto">
							<Table className="border-separate border-spacing-0">
								<TableHeader className="[&_tr]:border-b-0">
									<TableRow className={DATA_TABLE_HEADER_ROW}>
										{renderSortableHead("Full Name", "fullName", "pl-4 pr-3")}
										{renderSortableHead("Email Address", "email", "px-3")}
										{renderSortableHead("Role", "roleName", "px-3")}
										{renderSortableHead(
											"Assigned by",
											"assignedByName",
											"px-3",
										)}
										{renderSortableHead(
											"Assigned Date",
											"assignedDate",
											"px-3",
										)}
										{renderSortableHead("Last Active", "lastActiveAt", "px-3")}
										<TableHead
											className={`${DATA_TABLE_HEADER_CELL} pl-3 pr-4 text-right`}
										>
											Action
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody className="[&_tr:last-child>td]:border-b-0">
									{filteredAndSortedUsers.map((user) => (
										<TableRow
											key={user.$id}
											className={DATA_TABLE_BODY_ROW_BASE}
										>
											<TableCell className="py-4">
												<div className="flex items-center gap-3">
													{hasCustomAvatar(user.avatar) ? (
														<div
															className="shrink-0 rounded-full overflow-hidden"
															style={{
																background:
																	"linear-gradient(135deg, #12477d 0%, #03afbf 100%)",
																padding: "2px",
																width: "32px",
																height: "32px",
															}}
														>
															<Image
																src={user.avatar!}
																alt=""
																width={28}
																height={28}
																className="h-7 w-7 rounded-full object-cover border-2 border-white"
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
													<span className="subtitle-2 text-slate-800">
														{user.fullName}
													</span>
												</div>
											</TableCell>
											<TableCell className="py-4 text-slate-700">
												<span className="body-2">{user.email}</span>
											</TableCell>
											<TableCell className="py-4 text-slate-700">
												<span className="body-2">
													{user.roleName || "Unassigned"}
												</span>
											</TableCell>
											<TableCell className="py-4 text-slate-700">
												<span className="body-2">
													{user.assignedByName || "System"}
												</span>
											</TableCell>
											<TableCell className="py-4 text-slate-700 whitespace-nowrap">
												<span className="body-2 tabular-nums">
													{formatDateTimeLabel(
														user.assignedDate || user.$createdAt,
													)}
												</span>
											</TableCell>
											<TableCell className="py-4 text-slate-700 whitespace-nowrap">
												<span className="body-2 tabular-nums">
													{formatDateTimeLabel(
														user.lastActiveAt || user.$updatedAt,
													)}
												</span>
											</TableCell>
											<TableCell className="py-4 text-right">
												<DropdownMenu>
													<AppDropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-9 w-9 rounded-full shad-no-focus text-slate-500 transition-colors hover:bg-white/30 hover:text-slate-800"
															aria-label={`Actions for ${user.fullName}`}
														>
															<Image
																src="/assets/icons/dots.svg"
																alt=""
																width={34}
																height={34}
															/>
														</Button>
													</AppDropdownMenuTrigger>
													<AppDropdownMenuContent
														align="end"
														className="min-w-[230px]"
													>
														<AppDropdownMenuItem
															icon={UserRound}
															onSelect={() =>
																handleAction(user.fullName, "View profile")
															}
														>
															View profile
														</AppDropdownMenuItem>
														<AppDropdownMenuItem
															icon={PencilIcon}
															disabled={!canManageUsers}
															onSelect={() =>
																handleAction(user.fullName, "Edit user details")
															}
														>
															Edit user details
														</AppDropdownMenuItem>
														<AppDropdownMenuItem
															icon={ShieldCheck}
															disabled={!canAssignRoles}
															onSelect={() =>
																handleAction(
																	user.fullName,
																	"Change role or permissions",
																)
															}
														>
															Change role / permissions
														</AppDropdownMenuItem>
														<DropdownMenuSeparator />
														<AppDropdownMenuItem
															icon={KeyRound}
															disabled={!canManageUsers}
															onSelect={() =>
																handleAction(user.fullName, "Reset password")
															}
														>
															Reset password
														</AppDropdownMenuItem>
														<AppDropdownMenuItem
															icon={LogOut}
															disabled={!canManageUsers}
															onSelect={() =>
																handleAction(
																	user.fullName,
																	"Revoke active sessions",
																)
															}
														>
															Revoke active sessions
														</AppDropdownMenuItem>
														<AppDropdownMenuItem
															icon={Power}
															disabled={!canManageUsers}
															onSelect={() =>
																handleAction(
																	user.fullName,
																	"Suspend or reactivate account",
																)
															}
														>
															Suspend / reactivate account
														</AppDropdownMenuItem>
														<DropdownMenuSeparator />
														<AppDropdownMenuItem
															icon={UserX}
															tone="danger"
															disabled={!canManageUsers}
															onSelect={() =>
																handleAction(user.fullName, "Delete user")
															}
														>
															Delete user
														</AppDropdownMenuItem>
													</AppDropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))}
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

			<Dialog
				open={!!actionUserName}
				onOpenChange={() => setActionUserName(null)}
			>
				<DialogContent className="overflow-hidden p-0 shadow-xl sm:max-w-md">
					<DialogTitle className="sr-only">User action selected</DialogTitle>
					<div className="h-4 w-full bg-[#d6d7d8] opacity-70" />
					<div className="px-6 py-5 space-y-2 bg-white">
						<p className="text-base font-semibold sidebar-gradient-text">
							Action selected
						</p>
						<p className="text-sm text-slate-600">
							{actionLabel} for {actionUserName}
						</p>
					</div>
					<div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end">
						<Button
							type="button"
							variant="ghost"
							className="primary-btn px-3 sm:px-4"
							onClick={() => setActionUserName(null)}
						>
							<Ban className="h-4 w-4" />
							Close
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default UserManagement;
