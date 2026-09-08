"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	AlertTriangle,
	Bell,
	Clock,
	Edit,
	LayersPlus,
	Trash2,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { useToast } from "@/hooks/use-toast";
import type {
	EscalationRule,
	NotificationChannel,
} from "@/lib/services/calendar-notifications.service";

interface EscalationRulesManagerProps {
	onRuleCreated?: (rule: EscalationRule) => void;
	onRuleUpdated?: (rule: EscalationRule) => void;
	onRuleDeleted?: () => void;
}

const TRIGGER_EVENT_LABELS: Record<EscalationRule["triggerEvent"], string> = {
	reminder_not_sent: "Reminder Not Sent",
	event_created: "Event Created",
	event_updated: "Event Updated",
	event_cancelled: "Event Cancelled",
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
	in_app: "In-App",
	email: "Email",
	sms: "SMS",
	push: "Push Notification",
};

export const EscalationRulesManager: React.FC<EscalationRulesManagerProps> = ({
	onRuleCreated,
	onRuleUpdated,
	onRuleDeleted,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [rules, setRules] = useState<EscalationRule[]>([]);
	const [loading, setLoading] = useState(false);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [ruleToEdit, setRuleToEdit] = useState<EscalationRule | null>(null);
	const [ruleToDelete, setRuleToDelete] = useState<EscalationRule | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [userSearch, setUserSearch] = useState("");
	const [userSearchResults, setUserSearchResults] = useState<
		Array<{ $id: string; fullName?: string; email: string; name?: string }>
	>([]);
	const [isSearchingUsers, setIsSearchingUsers] = useState(false);
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
	const [selectedUsers, setSelectedUsers] = useState<
		Array<{ $id: string; fullName?: string; email: string; name?: string }>
	>([]);
	const [formData, setFormData] = useState({
		name: "",
		triggerEvent: "reminder_not_sent" as EscalationRule["triggerEvent"],
		delayMinutes: 60,
		escalationChannels: ["in_app"] as NotificationChannel[],
		escalateToUserIds: [] as string[],
	});
	const { toast } = useToast();

	const fetchRules = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/calendar/escalation-rules");
			if (response.ok) {
				const data = await response.json();
				setRules(data.rules || []);
			} else {
				throw new Error("Failed to fetch escalation rules");
			}
		} catch (error) {
			console.error("Error fetching escalation rules:", error);
			toast({
				title: "Error",
				description: "Failed to load escalation rules",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, []);

	const searchUsers = useCallback(async (query: string) => {
		setIsSearchingUsers(true);
		try {
			const response = await fetch(
				`/api/users/search?q=${encodeURIComponent(query)}`,
			);
			if (!response.ok) {
				setUserSearchResults([]);
				return;
			}
			// API returns an array, not { users: [] }
			const data = await response.json();
			const users = Array.isArray(data) ? data : data.users || [];
			setUserSearchResults(
				users.filter((user: { $id?: string }) => Boolean(user?.$id)),
			);
		} catch (error) {
			console.error("Error searching users:", error);
			setUserSearchResults([]);
		} finally {
			setIsSearchingUsers(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen) {
			fetchRules();
		}
	}, [isOpen, fetchRules]);

	useEffect(() => {
		if (userSearch.length < 2) {
			setIsSearchingUsers(false);
			setUserSearchResults((prev) => (prev.length === 0 ? prev : []));
			return;
		}
		setIsSearchingUsers(true);
		const debounceTimer = setTimeout(() => {
			searchUsers(userSearch);
		}, 300);
		return () => clearTimeout(debounceTimer);
	}, [userSearch, searchUsers]);

	const handleCreate = () => {
		setFormData({
			name: "",
			triggerEvent: "reminder_not_sent",
			delayMinutes: 60,
			escalationChannels: ["in_app"],
			escalateToUserIds: [],
		});
		setSelectedUserIds([]);
		setSelectedUsers([]);
		setUserSearch("");
		setUserSearchResults([]);
		setIsCreateDialogOpen(true);
	};

	const handleEdit = (rule: EscalationRule) => {
		setRuleToEdit(rule);
		setFormData({
			name: rule.name,
			triggerEvent: rule.triggerEvent,
			delayMinutes: rule.delayMinutes,
			escalationChannels: rule.escalationChannels,
			escalateToUserIds: rule.escalateToUserIds,
		});
		setSelectedUserIds(rule.escalateToUserIds);
		setSelectedUsers([]);
		setIsEditDialogOpen(true);
	};

	const handleDelete = (rule: EscalationRule) => {
		setRuleToDelete(rule);
		setIsDeleteDialogOpen(true);
	};

	const confirmDelete = async () => {
		if (!ruleToDelete) return;

		setIsDeleting(true);
		try {
			const response = await fetch(
				`/api/calendar/escalation-rules/${ruleToDelete.$id}`,
				{
					method: "DELETE",
				},
			);

			if (response.ok) {
				toast({
					title: "Success",
					description: "Escalation rule deleted successfully",
				});
				await fetchRules();
				setIsDeleteDialogOpen(false);
				setRuleToDelete(null);
				if (onRuleDeleted) {
					onRuleDeleted();
				}
			} else {
				throw new Error("Failed to delete escalation rule");
			}
		} catch (error) {
			console.error("Error deleting escalation rule:", error);
			toast({
				title: "Error",
				description: "Failed to delete escalation rule",
				variant: "destructive",
			});
		} finally {
			setIsDeleting(false);
		}
	};

	const handleSave = async () => {
		if (!formData.name.trim()) {
			toast({
				title: "Validation Error",
				description: "Rule name is required",
				variant: "destructive",
			});
			return;
		}

		if (formData.escalateToUserIds.length === 0) {
			toast({
				title: "Validation Error",
				description: "At least one user must be selected for escalation",
				variant: "destructive",
			});
			return;
		}

		setIsSaving(true);
		try {
			const url = ruleToEdit
				? `/api/calendar/escalation-rules/${ruleToEdit.$id}`
				: "/api/calendar/escalation-rules";
			const method = ruleToEdit ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			if (response.ok) {
				const data = await response.json();
				toast({
					title: "Success",
					description: ruleToEdit
						? "Escalation rule updated successfully"
						: "Escalation rule created successfully",
				});
				await fetchRules();
				setIsCreateDialogOpen(false);
				setIsEditDialogOpen(false);
				setRuleToEdit(null);
				if (ruleToEdit && onRuleUpdated) {
					onRuleUpdated(data.rule);
				} else if (!ruleToEdit && onRuleCreated) {
					onRuleCreated(data.rule);
				}
			} else {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to save escalation rule");
			}
		} catch (error) {
			console.error("Error saving escalation rule:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to save escalation rule",
				variant: "destructive",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const toggleChannel = (channel: NotificationChannel) => {
		const channels = formData.escalationChannels.includes(channel)
			? formData.escalationChannels.filter((c) => c !== channel)
			: [...formData.escalationChannels, channel];
		setFormData({ ...formData, escalationChannels: channels });
	};

	const addUser = (user: {
		$id: string;
		fullName?: string;
		email: string;
		name?: string;
	}) => {
		if (!selectedUserIds.includes(user.$id)) {
			const nextIds = [...selectedUserIds, user.$id];
			setSelectedUserIds(nextIds);
			setSelectedUsers((prev) =>
				prev.some((selected) => selected.$id === user.$id)
					? prev
					: [...prev, user],
			);
			setFormData({
				...formData,
				escalateToUserIds: nextIds,
			});
		}
		setUserSearch("");
		setUserSearchResults([]);
	};

	const removeUser = (userId: string) => {
		const updated = selectedUserIds.filter((id) => id !== userId);
		setSelectedUserIds(updated);
		setSelectedUsers((prev) => prev.filter((user) => user.$id !== userId));
		setFormData({ ...formData, escalateToUserIds: updated });
	};

	const formatDelay = (minutes: number): string => {
		if (minutes < 60) {
			return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
		} else if (minutes < 1440) {
			const hours = Math.floor(minutes / 60);
			return `${hours} hour${hours !== 1 ? "s" : ""}`;
		} else {
			const days = Math.floor(minutes / 1440);
			return `${days} day${days !== 1 ? "s" : ""}`;
		}
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					<Button
						size="sm"
						variant="outline"
						className="primary-btn px-3 sm:px-4"
					>
						<Bell className="h-4 w-4" />
						Escalation Rules
					</Button>
				</DialogTrigger>
				<DialogContent className="flex max-h-[90vh] max-w-120 flex-col overflow-hidden border border-slate-200 p-0 shadow-xl sm:rounded-2xl">
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

					<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
						<div className="flex items-start justify-between gap-3 px-6">
							<div className="flex items-start gap-3">
								<StatCardIcon
									icon={Bell}
									className="h-9 w-9"
									iconClassName="h-4 w-4"
								/>
								<div>
									<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
										Escalation Rules
									</DialogTitle>
									<DialogDescription className="mt-0.5 text-sm text-slate-600">
										Configure automatic notification escalation rules
									</DialogDescription>
								</div>
							</div>
							{rules.length > 0 && !loading ? (
								<Button
									onClick={handleCreate}
									className="primary-btn px-3 sm:px-4"
									size="sm"
								>
									<LayersPlus className="h-4 w-4" />
									New Rule
								</Button>
							) : null}
						</div>
					</div>

					<div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-8">
						{loading ? (
							<div className="flex items-center justify-center py-16">
								<div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0f5384] border-t-transparent" />
							</div>
						) : rules.length === 0 ? (
							<div className="flex flex-col items-center py-4 text-center">
								<div className="mb-5 flex h-22 w-22 items-center justify-center rounded-full border border-slate-200 bg-white">
									<Bell className="h-9 w-9 text-slate-400" strokeWidth={1.5} />
								</div>
								<h3 className="text-base font-semibold text-slate-700">
									No escalation rules configured
								</h3>
								<p className="mt-2 max-w-xs text-sm text-slate-500">
									Escalation rules automatically notify the right people when an
									alert goes unresolved.
								</p>
								<Button
									onClick={handleCreate}
									className="primary-btn mt-6 px-3 sm:px-4"
								>
									<LayersPlus className="h-4 w-4" />
									Create first rule
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								{rules.map((rule) => (
									<div key={rule.$id}>
										<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
											<div className="mb-2 flex items-center justify-between gap-3">
												<h3 className="text-base font-semibold text-slate-700">
													{rule.name}
												</h3>
												<Badge
													className={
														rule.isActive
															? "pointer-events-none h-auto rounded-full border-green/20 bg-green/10 py-0.5 text-xs text-green hover:bg-green/10"
															: "pointer-events-none h-auto rounded-full border-slate-200 bg-slate-100 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
													}
												>
													{rule.isActive ? "Active" : "Inactive"}
												</Badge>
											</div>
											<div className="space-y-1 text-sm text-slate-600">
												<div className="flex items-center gap-2">
													<AlertTriangle className="h-4 w-4 text-[#0f5384]" />
													<span>
														Trigger: {TRIGGER_EVENT_LABELS[rule.triggerEvent]}
													</span>
												</div>
												<div className="flex items-center gap-2">
													<Clock className="h-4 w-4 text-[#0f5384]" />
													<span>Delay: {formatDelay(rule.delayMinutes)}</span>
												</div>
												<div className="flex items-center gap-2">
													<Bell className="h-4 w-4 text-[#0f5384]" />
													<span>
														Channels:{" "}
														{rule.escalationChannels
															.map((c) => CHANNEL_LABELS[c])
															.join(", ")}
													</span>
												</div>
												<div className="flex items-center gap-2">
													<Users className="h-4 w-4 text-[#0f5384]" />
													<span>
														Escalate to: {rule.escalateToUserIds.length} user
														{rule.escalateToUserIds.length !== 1 ? "s" : ""}
													</span>
												</div>
											</div>
										</div>
										<div className="mt-2 flex items-center justify-end gap-3 pt-4">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleEdit(rule)}
												className="primary-btn px-3 sm:px-4"
											>
												<Edit className="h-4 w-4" />
												Edit
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleDelete(rule)}
												className="delete-btn px-3 sm:px-4"
											>
												<Trash2 className="h-4 w-4" />
												Delete
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Create/Edit Dialog */}
			<Dialog
				open={isCreateDialogOpen || isEditDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsCreateDialogOpen(false);
						setIsEditDialogOpen(false);
						setRuleToEdit(null);
						setFormData({
							name: "",
							triggerEvent: "reminder_not_sent",
							delayMinutes: 60,
							escalationChannels: ["in_app"],
							escalateToUserIds: [],
						});
						setSelectedUserIds([]);
						setSelectedUsers([]);
						setUserSearch("");
						setUserSearchResults([]);
					}
				}}
			>
				<DialogContent className="flex max-h-[90vh] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl sm:max-w-140">
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
					<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
						<div className="flex items-center gap-3 px-6">
							<StatCardIcon
								icon={ruleToEdit ? Edit : LayersPlus}
								className="h-9 w-9 shrink-0"
								iconClassName="h-4 w-4"
							/>
							<div className="min-w-0">
								<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
									{ruleToEdit
										? "Edit Escalation Rule"
										: "Create Escalation Rule"}
								</DialogTitle>
								<DialogDescription className="mt-1 text-sm text-slate-600">
									{ruleToEdit
										? "Update when this rule fires and who gets notified."
										: "Set when a reminder should escalate and who gets notified."}
								</DialogDescription>
							</div>
						</div>
					</div>

					<div className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-6">
						<div>
							<Label
								htmlFor="rule-name"
								className="text-sm font-semibold text-slate-700"
							>
								Rule Name <span className="text-red">*</span>
							</Label>
							<Input
								id="rule-name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="e.g., Escalate missed reminders to manager"
								className="mt-2 h-11 rounded-lg border-slate-300 bg-white"
							/>
						</div>

						<div>
							<Label
								htmlFor="trigger-event"
								className="text-sm font-semibold text-slate-700"
							>
								Trigger Event <span className="text-red">*</span>
							</Label>
							<Select
								value={formData.triggerEvent}
								onValueChange={(value) =>
									setFormData({
										...formData,
										triggerEvent: value as EscalationRule["triggerEvent"],
									})
								}
							>
								<SelectTrigger
									id="trigger-event"
									className="mt-2 h-11 rounded-lg border-slate-300 bg-white"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(TRIGGER_EVENT_LABELS).map(
										([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label
								htmlFor="delay-minutes"
								className="text-sm font-semibold text-slate-700"
							>
								Delay Before Escalation (minutes){" "}
								<span className="text-red">*</span>
							</Label>
							<Input
								id="delay-minutes"
								type="number"
								min="1"
								value={formData.delayMinutes}
								onChange={(e) =>
									setFormData({
										...formData,
										delayMinutes: parseInt(e.target.value, 10) || 60,
									})
								}
								className="mt-2 h-11 rounded-lg border-slate-300 bg-white"
							/>
							<p className="mt-1.5 text-sm text-slate-500">
								{formatDelay(formData.delayMinutes)} after trigger event
							</p>
						</div>

						<div>
							<Label className="text-sm font-semibold text-slate-700">
								Escalation Channels <span className="text-red">*</span>
							</Label>
							<div className="mt-3 space-y-3">
								{Object.entries(CHANNEL_LABELS).map(([channel, label]) => (
									<div key={channel} className="flex items-center gap-2.5">
										<Checkbox
											id={`channel-${channel}`}
											checked={formData.escalationChannels.includes(
												channel as NotificationChannel,
											)}
											onCheckedChange={() =>
												toggleChannel(channel as NotificationChannel)
											}
										/>
										<Label
											htmlFor={`channel-${channel}`}
											className="cursor-pointer text-sm font-medium text-slate-700"
										>
											{label}
										</Label>
									</div>
								))}
							</div>
						</div>

						<div>
							<Label
								htmlFor="user-search"
								className="text-sm font-semibold text-slate-700"
							>
								Escalate To Users <span className="text-red">*</span>
							</Label>
							<div className="relative mt-2">
								<SearchField
									id="user-search"
									value={userSearch}
									onChange={(e) => setUserSearch(e.target.value)}
									placeholder="Search for users..."
									className="h-11"
									autoComplete="off"
								/>
								{userSearch.length >= 2 && (
									<div className="absolute bottom-full z-50 mb-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-300 bg-white shadow-lg">
										{isSearchingUsers ? (
											<p className="px-4 py-3 text-sm text-slate-500">
												Searching users...
											</p>
										) : userSearchResults.filter(
												(user) => !selectedUserIds.includes(user.$id),
											).length === 0 ? (
											<p className="px-4 py-3 text-sm text-slate-500">
												No users found
											</p>
										) : (
											userSearchResults
												.filter((user) => !selectedUserIds.includes(user.$id))
												.map((user) => {
													const displayName =
														user.fullName || user.name || user.email;
													return (
														<button
															key={user.$id}
															type="button"
															onClick={() => addUser(user)}
															className="w-full px-4 py-2 text-left transition-colors hover:bg-blue-50"
														>
															<div className="text-sm font-medium text-slate-700">
																{displayName}
															</div>
															{user.email && displayName !== user.email && (
																<div className="text-xs text-slate-500">
																	{user.email}
																</div>
															)}
														</button>
													);
												})
										)}
									</div>
								)}
							</div>
							{selectedUserIds.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-2">
									{selectedUserIds.map((userId) => {
										const user = selectedUsers.find((u) => u.$id === userId);
										const displayName =
											user?.fullName || user?.name || user?.email || userId;
										return (
											<Badge
												key={userId}
												variant="secondary"
												className="flex items-center gap-1 border-blue/20 bg-blue/10 text-slate-700"
											>
												{displayName}
												<button
													type="button"
													onClick={() => removeUser(userId)}
													className="ml-1 cursor-pointer hover:text-red"
													aria-label={`Remove ${displayName}`}
												>
													<X className="h-3 w-3" />
												</button>
											</Badge>
										);
									})}
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
						<Button
							onClick={handleSave}
							className="primary-btn px-3 sm:px-4"
							disabled={isSaving}
						>
							{isSaving ? (
								<>
									<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
									Saving...
								</>
							) : (
								<>
									<LayersPlus className="h-4 w-4" />
									{ruleToEdit ? "Update Rule" : "Create Rule"}
								</>
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent
					className="overflow-hidden p-0 shadow-xl sm:max-w-md"
					variant="destructive"
				>
					<VisuallyHiddenPrimitive.Root>
						<DialogTitle>Delete Escalation Rule</DialogTitle>
					</VisuallyHiddenPrimitive.Root>
					<div className="h-4 w-full bg-[#d6d7d8] opacity-70" />
					<div className="glass-dialog-alert-section">
						<div className="flex items-start gap-3">
							<AlertTriangle className="w-5 h-5 text-[#f0c974]" />
							<div>
								<h2 className="text-base font-semibold sidebar-gradient-text">
									Delete Escalation Rule
								</h2>
								<DialogDescription className="text-sm text-slate-600 mt-1">
									Are you sure you want to delete &quot;{ruleToDelete?.name}
									&quot;? This action cannot be undone.
								</DialogDescription>
							</div>
						</div>
					</div>
					<div className="glass-dialog-alert-body">
						<p className="text-sm text-slate-700">
							This will permanently remove the escalation rule and all its
							configuration.
						</p>
					</div>
					<div className="glass-dialog-alert-footer">
						<div className="text-xs text-slate-500">
							This action is permanent.
						</div>
						<div className="flex items-center justify-end gap-3">
							<Button
								onClick={confirmDelete}
								className="delete-btn px-3 sm:px-4"
								disabled={isDeleting}
							>
								{isDeleting ? (
									<>
										<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-red border-t-transparent"></div>
										Deleting...
									</>
								) : (
									<>
										<Trash2 className="w-4 h-4" />
										Delete Rule
									</>
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};
