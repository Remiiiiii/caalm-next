"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	Calendar as CalendarIcon,
	Check,
	Edit,
	Eye,
	Share2,
	Shield,
	UserPlus,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { useSharedCalendars } from "@/hooks/useSharedCalendars";
import type { CalendarPermissionLevel } from "@/lib/actions/shared-calendar.actions";
import { CALENDAR_PERMISSION_LABELS } from "@/lib/actions/shared-calendar.actions";

interface SharePrimaryCalendarDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onShared?: () => void;
}

interface User {
	$id: string;
	fullName: string;
	email: string;
}

export const SharePrimaryCalendarDialog: React.FC<
	SharePrimaryCalendarDialogProps
> = ({ open, onOpenChange, onShared }) => {
	const [sharing, setSharing] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<User[]>([]);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [permissionLevel, setPermissionLevel] =
		useState<CalendarPermissionLevel>("view_all");
	const [searching, setSearching] = useState(false);
	const { toast } = useToast();
	const { refresh } = useSharedCalendars();

	// Search for users
	useEffect(() => {
		if (!searchQuery.trim() || searchQuery.length < 2) {
			setSearchResults([]);
			return;
		}

		const searchUsers = async () => {
			setSearching(true);
			try {
				const response = await fetch(
					`/api/users/search?q=${encodeURIComponent(searchQuery)}`,
				);
				if (response.ok) {
					const users = await response.json();
					// API returns array directly, not wrapped in { users: [] }
					setSearchResults(users || []);
				}
			} catch (error) {
				console.error(
					"[CLIENT] SharePrimaryCalendarDialog] Error searching users:",
					error,
				);
			} finally {
				setSearching(false);
			}
		};

		const debounceTimer = setTimeout(searchUsers, 300);
		return () => clearTimeout(debounceTimer);
	}, [searchQuery]);

	const handleShare = async () => {
		if (!selectedUser) {
			toast({
				title: "Validation Error",
				description: "Please select a user to share with",
				variant: "destructive",
			});
			return;
		}

		try {
			setSharing(true);
			const response = await fetch("/api/calendar/primary/share", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sharedWithUserId: selectedUser.$id,
					permissionLevel,
				}),
			});

			if (response.ok) {
				// Immediately refresh shared calendars for both sender and recipient
				await refresh();

				toast({
					title: "Success",
					description: `Calendar shared with ${selectedUser.fullName} successfully`,
				});
				setSelectedUser(null);
				setSearchQuery("");
				setSearchResults([]);
				setPermissionLevel("view_all");
				onShared?.();
				onOpenChange(false);
			} else {
				const error = await response.json();
				toast({
					title: "Error",
					description: error.message || "Failed to share calendar",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error(
				"[CLIENT] SharePrimaryCalendarDialog] Error sharing calendar:",
				error,
			);
			toast({
				title: "Error",
				description: "Failed to share calendar",
				variant: "destructive",
			});
		} finally {
			setSharing(false);
		}
	};

	const handleCancel = () => {
		setSelectedUser(null);
		setSearchQuery("");
		setSearchResults([]);
		setPermissionLevel("view_all");
		onOpenChange(false);
	};

	const getPermissionIcon = (level: CalendarPermissionLevel) => {
		switch (level) {
			case "view_busy":
			case "view_titles":
			case "view_all":
				return <Eye className="w-4 h-4" />;
			case "edit":
				return <Edit className="w-4 h-4" />;
			case "delegate":
				return <Shield className="w-4 h-4" />;
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) handleCancel();
				else onOpenChange(true);
			}}
		>
			<DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col">
				<VisuallyHiddenPrimitive.Root>
					<DialogTitle>Share Your Calendar</DialogTitle>
					<DialogDescription>
						Share your primary calendar with others and control what they can
						see
					</DialogDescription>
				</VisuallyHiddenPrimitive.Root>
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

				{/* Professional Header */}
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center justify-between ml-6">
						<div className="flex items-center">
							<div>
								<div className="flex items-center gap-2">
									<CalendarIcon className="h-5 w-5 text-[#0f5384]" />
									<h2 className="text-xl font-semibold sidebar-gradient-text">
										Share Your Calendar
									</h2>
								</div>
								<p className="text-sm text-slate-600 mt-1 ml-7">
									Share your primary calendar with team members and control
									their access level
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
					<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
						<Label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
							<Share2 className="w-4 h-4 text-blue-600" />
							Share With
						</Label>

						<div className="space-y-4">
							<div>
								<Label
									htmlFor="user-search"
									className="text-sm text-slate-700 mb-1 block"
								>
									Search for a user
								</Label>
								<div className="relative">
									<Input
										id="user-search"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Type to search users by name or email..."
										className="bg-white border-slate-300 pr-10"
									/>
									{searching && (
										<div className="absolute right-3 top-1/2 -translate-y-1/2">
											<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
										</div>
									)}
								</div>

								{/* Search Results */}
								{searchResults.length > 0 && (
									<div className="mt-2 border border-slate-200 rounded-lg bg-white max-h-48 overflow-y-auto">
										{searchResults.map((user) => (
											<button
												key={user.$id}
												type="button"
												onClick={() => {
													setSelectedUser(user);
													setSearchQuery(user.fullName || user.email);
													setSearchResults([]);
												}}
												className={`w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors ${
													selectedUser?.$id === user.$id
														? "bg-blue-50 border-l-2 border-blue-600"
														: ""
												}`}
											>
												<div className="flex items-center justify-between">
													<div>
														<div className="font-medium text-slate-700">
															{user.fullName}
														</div>
														<div className="text-sm text-slate-500">
															{user.email}
														</div>
													</div>
													{selectedUser?.$id === user.$id && (
														<Check className="w-5 h-5 text-blue-600" />
													)}
												</div>
											</button>
										))}
									</div>
								)}

								{/* Selected User Display */}
								{selectedUser && (
									<div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<UserPlus className="w-4 h-4 text-blue-600" />
												<div>
													<div className="font-medium text-slate-700">
														{selectedUser.fullName}
													</div>
													<div className="text-sm text-slate-600">
														{selectedUser.email}
													</div>
												</div>
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													setSelectedUser(null);
													setSearchQuery("");
												}}
												className="text-slate-500 hover:text-slate-700"
											>
												Remove
											</Button>
										</div>
									</div>
								)}
							</div>

							<div>
								<Label className="text-sm text-slate-700 mb-2 block">
									Permission Level
								</Label>
								<Select
									value={permissionLevel}
									onValueChange={(value) =>
										setPermissionLevel(value as CalendarPermissionLevel)
									}
								>
									<SelectTrigger className="bg-white border-slate-300">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(CALENDAR_PERMISSION_LABELS).map(
											([level, { label, description }]) => (
												<SelectItem key={level} value={level}>
													<div className="flex items-start gap-2 py-1">
														{getPermissionIcon(
															level as CalendarPermissionLevel,
														)}
														<div>
															<div className="font-medium">{label}</div>
															<div className="text-xs text-slate-500">
																{description}
															</div>
														</div>
													</div>
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</div>

				{/* Professional Footer */}
				<div className="glass-dialog-footer-wrap">
					<div className="flex items-center justify-end gap-3">
						<Button
							className="primary-btn px-3 sm:px-4"
							onClick={handleShare}
							disabled={sharing || !selectedUser}
						>
							{sharing ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
									Sharing...
								</>
							) : (
								<>
									<Share2 className="w-4 h-4" />
									Share Calendar
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
