"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn } from "@/lib/utils";

interface RoleRow {
	$id: string;
	name: string;
	description?: string;
	isSystemRole: boolean;
	orgId?: string;
	createdBy: string;
	memberCount?: number;
	$createdAt?: string;
	createdAt?: string;
}

function getRoleCreatedIso(role: RoleRow): string | undefined {
	return role.$createdAt || role.createdAt;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

/** One integer + unit (sec, min, hour(s), or day(s)); `nowMs` fixed per page visit until refresh. */
function formatRoleCreatedLabel(iso: string | undefined, nowMs: number): string {
	if (!iso) return "—";
	const t = new Date(iso).getTime();
	if (Number.isNaN(t)) return "—";
	const elapsed = nowMs - t;
	if (elapsed < 0) return "—";

	if (elapsed >= DAY_MS) {
		const days = Math.floor(elapsed / DAY_MS);
		return `${days} ${days === 1 ? "day" : "days"} ago`;
	}
	if (elapsed >= HOUR_MS) {
		const hours = Math.floor(elapsed / HOUR_MS);
		return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
	}
	if (elapsed >= MIN_MS) {
		const mins = Math.floor(elapsed / MIN_MS);
		return `${mins} min ago`;
	}
	const secs = Math.floor(elapsed / 1000);
	return `${secs} sec ago`;
}

function RoleActionsMenu({
	role,
	variant,
	onDeleteRequest,
	canManage,
}: {
	role: RoleRow;
	variant: "default" | "custom";
	onDeleteRequest: (role: RoleRow) => void;
	canManage: boolean;
}) {
	const router = useRouter();

	const goToRole = () => {
		router.push(`/dashboard/admin/roles/${role.$id}`);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-9 w-9 shad-no-focus text-slate-500 hover:text-slate-800"
					aria-label={`Actions for ${role.name}`}
				>
					<Image src="/assets/icons/dots.svg" alt="" width={34} height={34} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="relative min-w-[200px] p-0">
				<div className="absolute top-0 left-0 right-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="px-1 pb-1 pt-4">
					{variant === "default" ? (
						<DropdownMenuItem
							className="shad-dropdown-item cursor-pointer"
							disabled={!canManage}
							onSelect={(e) => {
								e.preventDefault();
								if (canManage) goToRole();
							}}
						>
							Edit permissions &amp; description
						</DropdownMenuItem>
					) : (
						<>
							<DropdownMenuItem
								className="shad-dropdown-item cursor-pointer"
								disabled={!canManage}
								onSelect={(e) => {
									e.preventDefault();
									if (canManage) goToRole();
								}}
							>
								View role
							</DropdownMenuItem>
							<DropdownMenuItem
								className="shad-dropdown-item cursor-pointer"
								disabled={!canManage}
								onSelect={(e) => {
									e.preventDefault();
									if (canManage) goToRole();
								}}
							>
								Edit role &amp; permissions
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="shad-dropdown-item cursor-pointer text-destructive focus:text-destructive"
								disabled={!canManage}
								onSelect={(e) => {
									e.preventDefault();
									if (canManage) onDeleteRequest(role);
								}}
							>
								Delete role
							</DropdownMenuItem>
						</>
					)}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

const RolesManagement = () => {
	const [roles, setRoles] = useState<RoleRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [roleToDelete, setRoleToDelete] = useState<RoleRow | null>(null);
	const [pageNowMs] = useState(() => Date.now());
	const { toast } = useToast();
	const router = useRouter();
	const { orgId } = useOrganization();
	const { permissions } = usePermissions();

	const canAssignRoles = permissions.includes(PERMISSIONS.USERS.ASSIGN_ROLES);

	const fetchRoles = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/admin/roles?orgId=${orgId || ""}`);
			const data = await response.json();

			if (data.success) {
				setRoles(data.data || []);
			} else {
				toast({
					title: "Error",
					description: data.error || "Failed to fetch roles",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error fetching roles:", error);
			toast({
				title: "Error",
				description: "Failed to fetch roles",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [orgId, toast]);

	useEffect(() => {
		void fetchRoles();
	}, [fetchRoles]);

	const handleDelete = async () => {
		if (!roleToDelete) return;

		try {
			const response = await fetch(`/api/admin/roles/${roleToDelete.$id}`, {
				method: "DELETE",
			});

			const data = await response.json();

			if (data.success) {
				toast({
					title: "Success",
					description: "Role deleted successfully",
				});
				fetchRoles();
				setDeleteDialogOpen(false);
				setRoleToDelete(null);
			} else {
				toast({
					title: "Error",
					description: data.error || "Failed to delete role",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error deleting role:", error);
			toast({
				title: "Error",
				description: "Failed to delete role",
				variant: "destructive",
			});
		}
	};

	const filteredRoles = useMemo(
		() =>
			roles.filter((role) =>
				role.name.toLowerCase().includes(searchTerm.toLowerCase()),
			),
		[roles, searchTerm],
	);

	const defaultRoles = useMemo(
		() => filteredRoles.filter((r) => r.isSystemRole),
		[filteredRoles],
	);

	const customRoles = useMemo(
		() => filteredRoles.filter((r) => !r.isSystemRole),
		[filteredRoles],
	);

	const typeBadge = (isDefault: boolean) => (
		<Badge
			variant={isDefault ? "default" : "secondary"}
			className={cn(
				"font-medium",
				isDefault &&
					"font-medium! border-2 border-slate-500 bg-[#D3D3D3] text-[#878787] hover:bg-[#C0C0C0] hover:border-slate-600 transition-all duration-200 shadow-sm",
				!isDefault &&
					"font-medium! border-2 border-cyan-400 bg-[#7ceec6] text-[#12477D] hover:bg-[#9FE0E8] hover:border-cyan-500 transition-all duration-200 shadow-sm",
			)}
		>
			{isDefault ? "Default" : "Custom"}
		</Badge>
	);

	const renderRolesTable = (
		sectionRoles: RoleRow[],
		options: {
			showCreated: boolean;
			actionVariant: "default" | "custom";
			emptyLabel: string;
		},
	) => {
		if (sectionRoles.length === 0) {
			return (
				<p className="body-2 py-10 text-center text-slate-500">
					{options.emptyLabel}
				</p>
			);
		}

		return (
			<div className="w-full overflow-x-auto">
				<Table className="border-separate border-spacing-0">
					<TableHeader className="[&_tr]:border-b-0">
						<TableRow className={DATA_TABLE_HEADER_ROW}>
							<TableHead className={`${DATA_TABLE_HEADER_CELL} pl-4 pr-3`}>
								Name
							</TableHead>
							<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
								Description
							</TableHead>
							<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
								Members
							</TableHead>
							<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
								Type
							</TableHead>
							{options.showCreated ? (
								<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
									Created
								</TableHead>
							) : null}
							<TableHead
								className={`${DATA_TABLE_HEADER_CELL} pl-3 pr-4 text-right`}
							>
								Action
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="[&_tr:last-child>td]:border-b-0">
						{sectionRoles.map((role) => {
							return (
								<TableRow key={role.$id} className={DATA_TABLE_BODY_ROW_BASE}>
									<TableCell className="py-4">
										<p className="subtitle-2 text-slate-800">{role.name}</p>
									</TableCell>
									<TableCell className="max-w-md py-4">
										<span className="body-2 line-clamp-2 text-slate-600">
											{role.description?.trim() ? role.description : "—"}
										</span>
									</TableCell>
									<TableCell className="whitespace-nowrap py-4 text-slate-700">
										<span className="body-2 font-medium tabular-nums">
											{role.memberCount ?? 0}
										</span>
									</TableCell>
									<TableCell className="py-4 whitespace-nowrap">
										{typeBadge(options.actionVariant === "default")}
									</TableCell>
									{options.showCreated ? (
										<TableCell className="whitespace-nowrap py-4 text-slate-700">
											<span className="body-2 tabular-nums">
												{formatRoleCreatedLabel(
													getRoleCreatedIso(role),
													pageNowMs,
												)}
											</span>
										</TableCell>
									) : null}
									<TableCell className="py-4 text-right">
										<RoleActionsMenu
											role={role}
											variant={options.actionVariant}
											canManage={canAssignRoles}
											onDeleteRequest={(r) => {
												setRoleToDelete(r);
												setDeleteDialogOpen(true);
											}}
										/>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		);
	};

	return (
		<div className="container mx-auto space-y-8 p-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold sidebar-gradient-text">
						Role management
					</h1>
					<p className="mt-2 text-slate-600">
						Default roles ship with the product. Custom roles are reusable
						permission sets for your organization.
					</p>
				</div>
				<PermissionGate permission={PERMISSIONS.USERS.ASSIGN_ROLES}>
					<Button
						onClick={() => router.push("/dashboard/admin/roles/new")}
						className="primary-btn shrink-0"
					>
						<Plus className="mr-2 h-4 w-4" />
						Create role
					</Button>
				</PermissionGate>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center ">
				<Input
					placeholder="Search roles by name..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="max-w-md border-white/40 bg-white/40"
				/>
			</div>

			{loading ? (
				<div className="py-16 text-center text-slate-600">Loading roles…</div>
			) : filteredRoles.length === 0 ? (
				<div className="text-center py-12">
					<Image
						src="/assets/icons/no-data.svg"
						alt="No contracts found"
						width={250}
						height={250}
						className="mx-auto mb-4"
					/>
					<p className="text-2xl font-bold text-slate-700">OOPS!</p>
					<p className="body-1 text-slate-700">No roles match your search</p>
				</div>
			) : (
				<div className="space-y-10">
					<section className="space-y-3">
						<div>
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								Default roles
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Built-in roles with curated access. Edit permissions or
								description when your organization needs a different baseline.
							</p>
						</div>
						<Card className="w-[99.5%] border border-white/40 bg-white/30 shadow-lg backdrop-blur">
							<div className="glass-card-cap" />
							<CardContent className="p-6">
								{renderRolesTable(defaultRoles, {
									showCreated: false,
									actionVariant: "default",
									emptyLabel: "No default roles in this workspace.",
								})}
							</CardContent>
						</Card>
					</section>

					<section className="space-y-3">
						<div>
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								Custom roles
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Roles you define for your org. Use them to grant least-privilege
								access beyond the defaults.
							</p>
						</div>
						<Card className="w-[99.5%] border border-white/40 bg-white/30 shadow-lg backdrop-blur">
							<div className="glass-card-cap" />
							<CardContent className="p-6">
								{renderRolesTable(customRoles, {
									showCreated: true,
									actionVariant: "custom",
									emptyLabel: "No custom roles yet. Create one to get started.",
								})}
							</CardContent>
						</Card>
					</section>
				</div>
			)}

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete role</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete the role &quot;
							{roleToDelete?.name}
							&quot;? This cannot be undone. Roles assigned to users cannot be
							deleted.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => {
								setDeleteDialogOpen(false);
								setRoleToDelete(null);
							}}
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete}>
							Delete
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default RolesManagement;
