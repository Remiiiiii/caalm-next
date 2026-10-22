"use client";

import {
	AlertTriangle,
	Calendar as CalendarIcon,
	Check,
	Edit,
	Globe,
	Lock,
	Share2,
	Trash2,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AppDialog } from "@/components/ui/app-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSharedCalendars } from "@/hooks/useSharedCalendars";
import type {
	CalendarPermissionLevel,
	CalendarSharePermission,
} from "@/lib/actions/shared-calendar.actions";
import { CALENDAR_PERMISSION_LABELS } from "@/lib/actions/shared-calendar.actions";
import { cn } from "@/lib/utils";

interface SharedCalendar {
	$id: string;
	name: string;
	description?: string;
	ownerId: string;
	ownerAccountId: string;
	organizationId: string;
	isPrimaryCalendar?: boolean;
	isTeamCalendar: boolean;
	teamId?: string;
	color?: string;
	isPublic: boolean;
	sharePermissions?: CalendarSharePermission[]; // New: Per-user permissions
	sharedWith?: string[]; // Legacy: Array of user IDs who have access
	createdAt: string;
	updatedAt: string;
}

interface SharedCalendarManagerProps {
	onCalendarCreated?: (calendar: SharedCalendar) => void;
	onCalendarUpdated?: (calendar: SharedCalendar) => void;
	onCalendarDeleted?: () => void;
}

export const SharedCalendarManager: React.FC<SharedCalendarManagerProps> = ({
	onCalendarCreated,
	onCalendarUpdated,
	onCalendarDeleted,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [calendars, setCalendars] = useState<SharedCalendar[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedCalendar, setSelectedCalendar] =
		useState<SharedCalendar | null>(null);
	const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [calendarToEdit, setCalendarToEdit] = useState<SharedCalendar | null>(
		null,
	);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeleteCalendarDialogOpen, setIsDeleteCalendarDialogOpen] =
		useState(false);
	const [calendarToDelete, setCalendarToDelete] =
		useState<SharedCalendar | null>(null);
	const [sharedUsers, setSharedUsers] = useState<
		Array<{
			$id: string;
			fullName?: string;
			name?: string;
			email: string;
			permissionLevel?: CalendarPermissionLevel;
		}>
	>([]);
	const [userSearch, setUserSearch] = useState("");
	const [searchResults, setSearchResults] = useState<
		Array<{ $id: string; fullName?: string; name?: string; email: string }>
	>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [editFormData, setEditFormData] = useState({
		name: "",
		description: "",
		isTeamCalendar: false,
		color: "#3b82f6",
		isPublic: false,
		isCustomColor: false,
	});
	const { toast } = useToast();

	// Use optimized SWR hook for shared calendars
	const {
		calendars: swrCalendars,
		isLoading: swrLoading,
		refresh,
	} = useSharedCalendars();

	useEffect(() => {
		if (isOpen) {
			// Update local state from SWR data (cast to match component's type)
			setCalendars(swrCalendars as SharedCalendar[]);
			setLoading(swrLoading);
		}
	}, [isOpen, swrCalendars, swrLoading]);

	const fetchCalendars = async () => {
		// Use SWR's mutate to refresh data
		await refresh();
		// Type assertion needed due to slight type differences between hook and component
		setCalendars(swrCalendars as any);
	};

	const loadSharedUsers = useCallback(
		async (calendar?: SharedCalendar | null) => {
			// Use provided calendar or fall back to selectedCalendar
			const calendarToUse = calendar || selectedCalendar;

			// Get user IDs from sharePermissions (new) or sharedWith (legacy)
			const userIds: string[] = [];
			if (
				calendarToUse?.sharePermissions &&
				calendarToUse.sharePermissions.length > 0
			) {
				userIds.push(...calendarToUse.sharePermissions.map((p) => p.userId));
			} else if (
				calendarToUse?.sharedWith &&
				calendarToUse.sharedWith.length > 0
			) {
				userIds.push(...calendarToUse.sharedWith);
			}

			if (userIds.length === 0) {
				setSharedUsers([]);
				return;
			}

			try {
				const response = await fetch("/api/users/get-by-ids", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userIds }),
				});

				if (response.ok) {
					const users = await response.json();
					// Enrich users with permission levels
					const enrichedUsers = (Array.isArray(users) ? users : []).map(
						(user: any) => {
							const permission = calendarToUse?.sharePermissions?.find(
								(p) => p.userId === user.$id,
							);
							return {
								...user,
								permissionLevel: permission?.permissionLevel || "view_all", // Default for legacy
							};
						},
					);
					setSharedUsers(enrichedUsers);
				}
			} catch (error) {
				console.error(
					"[CLIENT] SharedCalendarManager] Error loading shared users:",
					error,
				);
			}
		},
		[selectedCalendar],
	);

	const searchUsers = useCallback(
		async (query: string) => {
			setIsSearching(true);
			try {
				const response = await fetch(
					`/api/users/search?q=${encodeURIComponent(query)}`,
				);
				if (response.ok) {
					const users = await response.json();
					// Filter out users already shared with
					const alreadySharedIds = selectedCalendar?.sharedWith || [];
					setSearchResults(
						users.filter(
							(u: { $id: string }) => !alreadySharedIds.includes(u.$id),
						),
					);
				}
			} catch (error) {
				console.error(
					"[CLIENT] SharedCalendarManager] Error searching users:",
					error,
				);
			} finally {
				setIsSearching(false);
			}
		},
		[selectedCalendar?.sharedWith],
	);

	// Load shared users when share dialog opens or selectedCalendar changes
	useEffect(() => {
		if (isShareDialogOpen && selectedCalendar) {
			loadSharedUsers();
		}
	}, [isShareDialogOpen, selectedCalendar, loadSharedUsers]);

	// Search for users
	useEffect(() => {
		if (userSearch.length >= 2) {
			searchUsers(userSearch);
		} else {
			setSearchResults([]);
		}
	}, [userSearch, searchUsers]);

	const handleAddUser = async (userId: string) => {
		if (!selectedCalendar) return;

		// Find the user in search results to immediately add to UI
		const userToAdd = searchResults.find(
			(u: { $id: string }) => u.$id === userId,
		);

		// Optimistic update: immediately add user to UI
		if (userToAdd) {
			setSharedUsers((prev) => [...prev, userToAdd]);
			setSearchResults((prev) => prev.filter((u) => u.$id !== userId));
		}

		try {
			const response = await fetch(
				`/api/calendar/shared/${selectedCalendar.$id}/users`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ action: "add", userId }),
				},
			);

			if (response.ok) {
				const data = await response.json();

				// Update the selected calendar immediately
				const updatedCalendar = data.calendar;
				setSelectedCalendar(updatedCalendar);

				// Reload shared users to ensure consistency
				await loadSharedUsers(updatedCalendar);

				toast({
					title: "Success",
					description: "User added to shared calendar",
				});

				// Refresh shared calendars immediately for both sender and recipient
				await refresh();
				await fetchCalendars();
				setUserSearch("");
				setSearchResults([]);
			} else {
				// Rollback optimistic update on error
				if (userToAdd) {
					setSharedUsers((prev) => prev.filter((u) => u.$id !== userId));
					setSearchResults((prev) => [...prev, userToAdd]);
				}
				const error = await response.json();
				toast({
					title: "Error",
					description: error.message || "Failed to add user",
					variant: "destructive",
				});
			}
		} catch (error) {
			// Rollback optimistic update on error
			if (userToAdd) {
				setSharedUsers((prev) => prev.filter((u) => u.$id !== userId));
				setSearchResults((prev) => [...prev, userToAdd]);
			}
			console.error(
				"[CLIENT] SharedCalendarManager] Error adding user:",
				error,
			);
			toast({
				title: "Error",
				description: "Failed to add user",
				variant: "destructive",
			});
		}
	};

	const handleUpdatePermission = async (
		userId: string,
		permissionLevel: CalendarPermissionLevel,
	) => {
		if (!selectedCalendar) return;

		// For primary calendars, use the new API endpoint
		if (selectedCalendar.isPrimaryCalendar) {
			try {
				const response = await fetch("/api/calendar/primary/share", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sharedWithUserId: userId,
						permissionLevel,
					}),
				});

				if (response.ok) {
					const data = await response.json();
					// Refresh shared calendars immediately
					await refresh();
					await fetchCalendars();
					await loadSharedUsers(data.calendar);
					toast({
						title: "Success",
						description: "Permission level updated",
					});
				} else {
					const error = await response.json();
					toast({
						title: "Error",
						description: error.message || "Failed to update permission",
						variant: "destructive",
					});
				}
			} catch (error) {
				console.error(
					"[CLIENT] SharedCalendarManager] Error updating permission:",
					error,
				);
				toast({
					title: "Error",
					description: "Failed to update permission",
					variant: "destructive",
				});
			}
		} else {
			toast({
				title: "Unavailable",
				description:
					"Permission updates aren't available for legacy shared calendars. Use a primary calendar share instead.",
			});
		}
	};

	const handleRemoveUser = async (userId: string) => {
		if (!selectedCalendar) return;

		// Optimistic update: immediately remove user from UI
		const userToRemove = sharedUsers.find((u) => u.$id === userId);
		setSharedUsers((prev) => prev.filter((u) => u.$id !== userId));

		// For primary calendars, use the new API endpoint
		if (selectedCalendar.isPrimaryCalendar) {
			try {
				const response = await fetch(
					`/api/calendar/primary/share?userId=${encodeURIComponent(userId)}`,
					{
						method: "DELETE",
					},
				);

				if (response.ok) {
					// Refresh shared calendars immediately
					await refresh();
					await fetchCalendars();
					toast({
						title: "Success",
						description: "User removed from calendar",
					});
				} else {
					// Rollback optimistic update
					if (userToRemove) {
						setSharedUsers((prev) => [...prev, userToRemove]);
					}
					const error = await response.json();
					toast({
						title: "Error",
						description: error.message || "Failed to remove user",
						variant: "destructive",
					});
				}
			} catch (error) {
				// Rollback optimistic update
				if (userToRemove) {
					setSharedUsers((prev) => [...prev, userToRemove]);
				}
				console.error(
					"[CLIENT] SharedCalendarManager] Error removing user:",
					error,
				);
				toast({
					title: "Error",
					description: "Failed to remove user",
					variant: "destructive",
				});
			}
			return;
		}

		// Legacy shared calendar removal
		try {
			const response = await fetch(
				`/api/calendar/shared/${selectedCalendar.$id}/users`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ action: "remove", userId }),
				},
			);

			if (response.ok) {
				const data = await response.json();

				// Update the selected calendar immediately
				const updatedCalendar = data.calendar;
				setSelectedCalendar(updatedCalendar);

				// Refresh shared calendars immediately
				await refresh();

				// Reload shared users to ensure consistency
				await loadSharedUsers(updatedCalendar);

				toast({
					title: "Success",
					description: "User removed from shared calendar",
				});

				await fetchCalendars();
			} else {
				// Rollback optimistic update on error
				if (userToRemove) {
					setSharedUsers((prev) => [...prev, userToRemove]);
				}
				const error = await response.json();
				toast({
					title: "Error",
					description: error.message || "Failed to remove user",
					variant: "destructive",
				});
			}
		} catch (error) {
			// Rollback optimistic update on error
			if (userToRemove) {
				setSharedUsers((prev) => [...prev, userToRemove]);
			}
			console.error(
				"[CLIENT] SharedCalendarManager] Error removing user:",
				error,
			);
			toast({
				title: "Error",
				description: "Failed to remove user",
				variant: "destructive",
			});
		}
	};

	const handleEditCalendar = (calendar: SharedCalendar) => {
		setCalendarToEdit(calendar);
		setEditFormData({
			name: calendar.name,
			description: calendar.description || "",
			isTeamCalendar: calendar.isTeamCalendar,
			color: calendar.color || "#3b82f6",
			isPublic: calendar.isPublic,
			isCustomColor: false,
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdateCalendar = async () => {
		if (!calendarToEdit || !editFormData.name.trim()) {
			toast({
				title: "Validation Error",
				description: "Calendar name is required",
				variant: "destructive",
			});
			return;
		}

		try {
			const response = await fetch(
				`/api/calendar/shared/${calendarToEdit.$id}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(editFormData),
				},
			);

			if (response.ok) {
				const data = await response.json();
				toast({
					title: "Success",
					description: "Shared calendar updated successfully",
				});
				await fetchCalendars();
				setIsEditDialogOpen(false);
				setCalendarToEdit(null);
				onCalendarUpdated?.(data.calendar);
				// Refresh calendars list
				if (isOpen) {
					await fetchCalendars();
				}
			} else {
				const error = await response.json();
				toast({
					title: "Error",
					description: error.message || "Failed to update shared calendar",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error(
				"[CLIENT] SharedCalendarManager] Error updating calendar:",
				error,
			);
			toast({
				title: "Error",
				description: "Failed to update shared calendar",
				variant: "destructive",
			});
		}
	};

	const handleDeleteCalendar = (calendar: SharedCalendar) => {
		setCalendarToDelete(calendar);
		setIsDeleteCalendarDialogOpen(true);
	};

	const confirmDeleteCalendar = async () => {
		if (!calendarToDelete) {
			return;
		}

		setIsDeleting(true);
		try {
			const response = await fetch(
				`/api/calendar/shared/${calendarToDelete.$id}`,
				{
					method: "DELETE",
				},
			);

			if (response.ok) {
				toast({
					title: "Success",
					description: "Shared calendar deleted successfully",
				});
				await fetchCalendars();
				setIsDeleteCalendarDialogOpen(false);
				setCalendarToDelete(null);
				onCalendarDeleted?.();
			} else {
				const error = await response.json();
				toast({
					title: "Error",
					description: error.message || "Failed to delete shared calendar",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error(
				"[CLIENT] SharedCalendarManager] Error deleting calendar:",
				error,
			);
			toast({
				title: "Error",
				description: "Failed to delete shared calendar",
				variant: "destructive",
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="primary-btn flex items-center justify-center px-3 sm:px-4"
				onClick={() => setIsOpen(true)}
			>
				<CalendarIcon className="h-4 w-4" />
				Manage Shared Calendars
			</Button>
			<AppDialog
				open={isOpen}
				onOpenChange={setIsOpen}
				size="form"
				className="max-w-175 max-h-[90vh]"
				icon={<CalendarIcon className="h-5 w-5" />}
				title="Shared Calendars"
				description="View and manage your shared calendars"
				footer={
					<Button
						type="button"
						variant="outline"
						className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
						onClick={() => setIsOpen(false)}
					>
						Close
					</Button>
				}
			>
					<div className="space-y-6 pb-1">
						{/* Calendars List */}
						{loading ? (
							<div className="text-center py-8 text-slate-500">
								Loading calendars...
							</div>
						) : calendars.length > 0 ? (
							<div className="space-y-3">
								<Label className="text-sm font-semibold text-slate-700">
									Shared Calendars ({calendars.length})
								</Label>
								{calendars.map((calendar) => (
									<div
										key={calendar.$id}
										className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between"
									>
										<div className="flex items-center gap-3 flex-1">
											<div
												className="w-4 h-4 rounded"
												style={{ backgroundColor: calendar.color || "#3b82f6" }}
											/>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="font-medium text-slate-700">
														{calendar.name}
													</span>
													{calendar.isPublic && (
														<Badge variant="secondary" className="text-xs">
															<Globe className="w-3 h-3 mr-1" />
															Public
														</Badge>
													)}
													{calendar.isTeamCalendar && (
														<Badge variant="secondary" className="text-xs">
															<Users className="w-3 h-3 mr-1" />
															Team
														</Badge>
													)}
												</div>
												{calendar.description && (
													<p className="text-sm text-slate-500 mt-1">
														{calendar.description}
													</p>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Button
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0"
												title="Share with users"
												onClick={() => {
													// Open share dialog for this calendar
													setSelectedCalendar(calendar);
													setIsShareDialogOpen(true);
												}}
											>
												<Share2 className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0"
												title="Edit calendar"
												onClick={() => handleEditCalendar(calendar)}
											>
												<Edit className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0 hover:bg-red-50"
												title="Delete calendar"
												onClick={() => handleDeleteCalendar(calendar)}
												disabled={isDeleting}
											>
												<Trash2 className="w-4 h-4 text-red-600" />
											</Button>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8 text-slate-500">
								No shared calendars yet. Use the Share button to create one.
							</div>
						)}
					</div>
			</AppDialog>
			{/* Share Calendar Dialog */}
			<AppDialog
				open={isShareDialogOpen}
				onOpenChange={setIsShareDialogOpen}
				size="form"
				className="max-w-[500px] max-h-[90vh]"
				icon={<Share2 className="h-5 w-5" />}
				title={`Share: ${selectedCalendar?.name ?? "Calendar"}`}
				description="Add or remove users who can access this shared calendar"
				footer={
					<Button
						type="button"
						variant="outline"
						className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
						onClick={() => {
							setIsShareDialogOpen(false);
							setSelectedCalendar(null);
							setUserSearch("");
							setSearchResults([]);
						}}
					>
						Close
					</Button>
				}
			>
					<div className="space-y-4 pb-1">
						{/* Add User Section */}
						<div>
							<Label className="text-sm font-semibold text-slate-700 mb-2 block">
								Add Users
							</Label>
							<div className="flex gap-2">
								<Input
									value={userSearch}
									onChange={(e) => setUserSearch(e.target.value)}
									placeholder="Search by name or email..."
									className="flex-1 bg-white border-slate-300"
								/>
							</div>

							{/* Search Results */}
							{searchResults.length > 0 && (
								<div className="mt-2 border border-slate-200 rounded-lg bg-white max-h-40 overflow-y-auto">
									{searchResults.map((user) => (
										<button
											key={user.$id}
											onClick={() => handleAddUser(user.$id)}
											className="w-full p-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center gap-3"
										>
											<div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-sm font-medium">
												{(user.fullName || user.name || "?")
													.charAt(0)
													.toUpperCase()}
											</div>
											<div className="flex-1">
												<div className="font-medium text-sm text-slate-700">
													{user.fullName || user.name}
												</div>
												<div className="text-xs text-slate-500">
													{user.email}
												</div>
											</div>
											<UserPlus className="w-4 h-4 text-blue-600" />
										</button>
									))}
								</div>
							)}

							{isSearching && (
								<div className="mt-2 text-sm text-slate-500 text-center py-2">
									Searching...
								</div>
							)}
						</div>

						{/* Shared Users List */}
						<div>
							<Label className="text-sm font-semibold text-slate-700 mb-2 block">
								Shared With ({sharedUsers.length})
							</Label>
							{sharedUsers.length > 0 ? (
								<div className="space-y-2">
									{sharedUsers.map((user: any) => {
										const permissionLevel =
											(user.permissionLevel as CalendarPermissionLevel) ||
											"view_all";
										const permissionLabel =
											CALENDAR_PERMISSION_LABELS[permissionLevel];
										return (
											<div
												key={user.$id}
												className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between"
											>
												<div className="flex items-center gap-3 flex-1">
													<div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-sm font-medium">
														{(user.fullName || user.name || "?")
															.charAt(0)
															.toUpperCase()}
													</div>
													<div className="flex-1">
														<div className="font-medium text-sm text-slate-700">
															{user.fullName || user.name}
														</div>
														<div className="text-xs text-slate-500">
															{user.email}
														</div>
													</div>
													<Badge variant="outline" className="text-xs">
														{permissionLabel.label}
													</Badge>
												</div>
												<div className="flex items-center gap-2">
													{selectedCalendar?.isPrimaryCalendar && (
														<Select
															value={permissionLevel}
															onValueChange={(value) =>
																handleUpdatePermission(
																	user.$id,
																	value as CalendarPermissionLevel,
																)
															}
														>
															<SelectTrigger className="w-32 h-8 text-xs">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{Object.entries(CALENDAR_PERMISSION_LABELS).map(
																	([level, { label }]) => (
																		<SelectItem key={level} value={level}>
																			{label}
																		</SelectItem>
																	),
																)}
															</SelectContent>
														</Select>
													)}
													<Button
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0 hover:bg-red-50"
														onClick={() => handleRemoveUser(user.$id)}
													>
														<X className="w-4 h-4 text-red-600" />
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							) : (
								<div className="text-center py-8 text-slate-500 text-sm">
									No users shared yet. Search and add users above.
								</div>
							)}
						</div>
					</div>
			</AppDialog>

			<AppDialog
				open={isEditDialogOpen}
				onOpenChange={(open) => {
					setIsEditDialogOpen(open);
					if (!open) setCalendarToEdit(null);
				}}
				size="form"
				className="max-w-[600px] max-h-[90vh]"
				icon={<Edit className="h-5 w-5" />}
				title={`Edit: ${calendarToEdit?.name ?? "Calendar"}`}
				description="Update the details of your shared calendar"
				footer={
					<>
						<Button
							type="button"
							variant="outline"
							className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
							onClick={() => {
								setIsEditDialogOpen(false);
								setCalendarToEdit(null);
							}}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="btn-primary"
							onClick={handleUpdateCalendar}
							disabled={!editFormData.name.trim()}
						>
							<Check className="h-4 w-4" />
							Update Calendar
						</Button>
					</>
				}
			>
					<div className="space-y-4 pb-1">
						<div>
							<Label
								htmlFor="edit-calendar-name"
								className="text-sm text-slate-700 mb-1 block"
							>
								Calendar Name *
							</Label>
							<Input
								id="edit-calendar-name"
								value={editFormData.name}
								onChange={(e) =>
									setEditFormData({ ...editFormData, name: e.target.value })
								}
								placeholder="e.g., Team Calendar, Project Alpha"
								className="bg-white border-slate-300"
							/>
						</div>

						<div>
							<Label
								htmlFor="edit-calendar-description"
								className="text-sm text-slate-700 mb-1 block"
							>
								Description
							</Label>
							<Textarea
								id="edit-calendar-description"
								value={editFormData.description}
								onChange={(e) =>
									setEditFormData({
										...editFormData,
										description: e.target.value,
									})
								}
								placeholder="Optional description for this calendar"
								rows={3}
								className="bg-white border-slate-300"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label className="text-sm text-slate-700 mb-2 block">
									Color
								</Label>
								<div className="space-y-3">
									<div className="flex items-center gap-3">
										{[
											"#ec4899", // Pink
											"#f97316", // Orange
											"#eab308", // Yellow
											"#22c55e", // Green
											"#3b82f6", // Blue
											"#a855f7", // Purple
											"#d97706", // Beige/Amber
										].map((color) => (
											<button
												key={color}
												type="button"
												onClick={() => {
													setEditFormData({
														...editFormData,
														color,
														isCustomColor: false,
													});
												}}
												className={cn(
													"w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
													editFormData.color === color &&
														!editFormData.isCustomColor
														? "border-slate-900 ring-2 ring-slate-300"
														: "border-slate-300 hover:border-slate-400",
												)}
												style={{ backgroundColor: color }}
												title={color}
											/>
										))}
									</div>

									<button
										type="button"
										onClick={() => {
											setEditFormData({ ...editFormData, isCustomColor: true });
											const colorInput = document.getElementById(
												"edit-custom-color-input",
											);
											colorInput?.click();
										}}
										className={cn(
											"flex items-center gap-2 text-sm text-slate-700 hover:text-slate-700 transition-colors",
											editFormData.isCustomColor &&
												"text-slate-700 font-medium",
										)}
									>
										{editFormData.isCustomColor && (
											<Check className="w-4 h-4 text-slate-700" />
										)}
										<span>Custom Color...</span>
										{editFormData.isCustomColor && editFormData.color && (
											<div
												className="w-4 h-4 rounded border border-slate-300 ml-auto"
												style={{ backgroundColor: editFormData.color }}
											/>
										)}
									</button>

									<input
										id="edit-custom-color-input"
										type="color"
										value={editFormData.color || "#3b82f6"}
										onChange={(e) =>
											setEditFormData({
												...editFormData,
												color: e.target.value,
												isCustomColor: true,
											})
										}
										className="hidden"
									/>
								</div>
							</div>

							<div>
								<Label className="text-sm text-slate-700 mb-2 block">
									Visibility
								</Label>
								<Select
									value={editFormData.isPublic ? "public" : "private"}
									onValueChange={(value) =>
										setEditFormData({
											...editFormData,
											isPublic: value === "public",
										})
									}
								>
									<SelectTrigger className="bg-white border-slate-300">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="private">
											<div className="flex items-center gap-2">
												<Lock className="w-4 h-4" />
												Private
											</div>
										</SelectItem>
										<SelectItem value="public">
											<div className="flex items-center gap-2">
												<Globe className="w-4 h-4" />
												Public
											</div>
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Checkbox
								id="edit-team-calendar"
								checked={editFormData.isTeamCalendar}
								onCheckedChange={(checked) =>
									setEditFormData({
										...editFormData,
										isTeamCalendar: checked as boolean,
									})
								}
							/>
							<Label
								htmlFor="edit-team-calendar"
								className="text-sm text-slate-700 cursor-pointer"
							>
								This is a team calendar
							</Label>
						</div>
					</div>
			</AppDialog>

			<ConfirmDialog
				open={isDeleteCalendarDialogOpen}
				onOpenChange={(open) => {
					setIsDeleteCalendarDialogOpen(open);
					if (!open) setCalendarToDelete(null);
				}}
				variant="destructive"
				icon={<AlertTriangle className="h-5 w-5" />}
				title="Delete Shared Calendar"
				description={`Are you sure you want to delete "${calendarToDelete?.name}"? This action cannot be undone and will remove the calendar for all shared users.`}
				note="Deleting this calendar will permanently remove it and all associated events. All users who have access to this calendar will lose access immediately."
				confirmLabel="Delete Calendar"
				confirmIcon={<Trash2 className="h-4 w-4" />}
				pendingLabel="Deleting…"
				onConfirm={confirmDeleteCalendar}
			/>
		</>
	);
};
