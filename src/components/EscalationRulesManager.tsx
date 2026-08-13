"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	AlertTriangle,
	Ban,
	Bell,
	Check,
	Clock,
	Edit,
	Minimize2,
	Plus,
	Trash2,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
		Array<{ $id: string; fullName?: string; email: string }>
	>([]);
	const [_isSearchingUsers, setIsSearchingUsers] = useState(false);
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
	const [formData, setFormData] = useState({
		name: "",
		triggerEvent: "reminder_not_sent" as EscalationRule["triggerEvent"],
		delayMinutes: 60,
		escalationChannels: ["in_app"] as NotificationChannel[],
		escalateToUserIds: [] as string[],
	});
	const { toast } = useToast();

	const fetchRules = async () => {
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
	};

	const searchUsers = async (query: string) => {
		setIsSearchingUsers(true);
		try {
			const response = await fetch(
				`/api/users/search?q=${encodeURIComponent(query)}`,
			);
			if (response.ok) {
				const data = await response.json();
				setUserSearchResults(data.users || []);
			}
		} catch (error) {
			console.error("Error searching users:", error);
		} finally {
			setIsSearchingUsers(false);
		}
	};

	useEffect(() => {
		if (isOpen) {
			fetchRules();
		}
	}, [isOpen, fetchRules]);

	useEffect(() => {
		if (userSearch.length >= 2) {
			searchUsers(userSearch);
		} else {
			setUserSearchResults([]);
		}
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

	const addUser = (user: { $id: string; fullName?: string; email: string }) => {
		if (!selectedUserIds.includes(user.$id)) {
			setSelectedUserIds([...selectedUserIds, user.$id]);
			setFormData({
				...formData,
				escalateToUserIds: [...selectedUserIds, user.$id],
			});
		}
		setUserSearch("");
		setUserSearchResults([]);
	};

	const removeUser = (userId: string) => {
		const updated = selectedUserIds.filter((id) => id !== userId);
		setSelectedUserIds(updated);
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
				<DialogContent className="glass-dialog">
					<VisuallyHiddenPrimitive.Root>
						<DialogTitle>Manage Escalation Rules</DialogTitle>
						<DialogDescription>
							Configure automatic escalation rules for calendar notifications
						</DialogDescription>
					</VisuallyHiddenPrimitive.Root>

					{/* Cap */}
					<div className="h-4 w-full bg-[#d6d7d8] opacity-70" />

					{/* Header */}
					<div className="glass-dialog-wizard-header px-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Bell className="h-5 w-5 text-[#0f5384]" />
								<div>
									<h2 className="text-xl font-semibold sidebar-gradient-text">
										Escalation Rules
									</h2>
									<p className="text-sm text-slate-600 mt-1">
										Configure automatic notification escalation rules
									</p>
								</div>
							</div>
							<Button
								onClick={handleCreate}
								className="primary-btn px-3 sm:px-4"
								size="sm"
							>
								<Plus className="h-4 w-4" />
								New Rule
							</Button>
						</div>
					</div>

					{/* Scrollable Content */}
					<div className="glass-dialog-body-padded">
						{loading ? (
							<div className="flex items-center justify-center py-12">
								<div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
							</div>
						) : rules.length === 0 ? (
							<div className="text-center py-12">
								<Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
								<p className="text-slate-600 mb-4">
									No escalation rules configured
								</p>
								<Button onClick={handleCreate} className="primary-btn">
									<Plus className="h-4 w-4" />
									Create First Rule
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								{rules.map((rule) => (
									<div
										key={rule.$id}
										className="rounded-lg border border-white/40 bg-white/30 p-4 backdrop-blur-sm transition-shadow hover:shadow-md"
									>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-3 mb-2">
													<h3 className="text-base font-semibold text-slate-700">
														{rule.name}
													</h3>
													<Badge
														variant={rule.isActive ? "default" : "secondary"}
													>
														{rule.isActive ? "Active" : "Inactive"}
													</Badge>
												</div>
												<div className="space-y-1 text-sm text-slate-600">
													<div className="flex items-center gap-2">
														<AlertTriangle className="h-4 w-4" />
														<span>
															Trigger: {TRIGGER_EVENT_LABELS[rule.triggerEvent]}
														</span>
													</div>
													<div className="flex items-center gap-2">
														<Clock className="h-4 w-4" />
														<span>Delay: {formatDelay(rule.delayMinutes)}</span>
													</div>
													<div className="flex items-center gap-2">
														<Bell className="h-4 w-4" />
														<span>
															Channels:{" "}
															{rule.escalationChannels
																.map((c) => CHANNEL_LABELS[c])
																.join(", ")}
														</span>
													</div>
													<div className="flex items-center gap-2">
														<Users className="h-4 w-4" />
														<span>
															Escalate to: {rule.escalateToUserIds.length} user
															{rule.escalateToUserIds.length !== 1 ? "s" : ""}
														</span>
													</div>
												</div>
											</div>
											<div className="flex items-center gap-2 ml-4">
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleEdit(rule)}
													className="primary-btn"
												>
													<Edit className="h-4 w-4" />
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleDelete(rule)}
													className="primary-btn text-red-600 hover:text-red-700"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="glass-dialog-footer-end">
						<Button
							variant="outline"
							onClick={() => setIsOpen(false)}
							className="primary-btn px-3 sm:px-4"
						>
							<Minimize2 className="w-4 h-4" />
							Close
						</Button>
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
						setUserSearch("");
						setUserSearchResults([]);
					}
				}}
			>
				<DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 shadow-xl sm:max-w-2xl">
					<VisuallyHiddenPrimitive.Root>
						<DialogTitle>
							{ruleToEdit ? "Edit Escalation Rule" : "Create Escalation Rule"}
						</DialogTitle>
						<DialogDescription>
							{ruleToEdit
								? "Update escalation rule configuration"
								: "Configure a new escalation rule for calendar notifications"}
						</DialogDescription>
					</VisuallyHiddenPrimitive.Root>

					{/* Cap */}
					<div className="h-4 w-full bg-[#d6d7d8] opacity-70" />

					{/* Header */}
					<div className="glass-dialog-wizard-header px-6">
						<h2 className="text-xl font-semibold sidebar-gradient-text">
							{ruleToEdit ? "Edit Escalation Rule" : "Create Escalation Rule"}
						</h2>
					</div>

					{/* Scrollable Content */}
					<div className="glass-dialog-body-padded space-y-6">
						<div>
							<Label htmlFor="rule-name" className="text-sm font-semibold">
								Rule Name *
							</Label>
							<Input
								id="rule-name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="e.g., Escalate missed reminders to manager"
								className="mt-1"
							/>
						</div>

						<div>
							<Label htmlFor="trigger-event" className="text-sm font-semibold">
								Trigger Event *
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
								<SelectTrigger className="mt-1">
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
							<Label htmlFor="delay-minutes" className="text-sm font-semibold">
								Delay Before Escalation (minutes) *
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
								className="mt-1"
							/>
							<p className="text-xs text-slate-500 mt-1">
								{formatDelay(formData.delayMinutes)} after trigger event
							</p>
						</div>

						<div>
							<Label className="text-sm font-semibold mb-3 block">
								Escalation Channels *
							</Label>
							<div className="space-y-2">
								{Object.entries(CHANNEL_LABELS).map(([channel, label]) => (
									<div key={channel} className="flex items-center space-x-2">
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
											className="text-sm font-normal cursor-pointer"
										>
											{label}
										</Label>
									</div>
								))}
							</div>
						</div>

						<div>
							<Label htmlFor="user-search" className="text-sm font-semibold">
								Escalate To Users *
							</Label>
							<Input
								id="user-search"
								value={userSearch}
								onChange={(e) => setUserSearch(e.target.value)}
								placeholder="Search for users..."
								className="mt-1"
							/>
							{userSearch.length >= 2 && userSearchResults.length > 0 && (
								<div className="mt-2 border border-slate-200 rounded-lg bg-white max-h-48 overflow-y-auto">
									{userSearchResults.map((user) => (
										<div
											key={user.$id}
											onClick={() => addUser(user)}
											className="px-4 py-2 hover:bg-slate-50 cursor-pointer"
										>
											<div className="text-sm font-medium">
												{user.fullName || user.email}
											</div>
											{user.fullName && (
												<div className="text-xs text-slate-500">
													{user.email}
												</div>
											)}
										</div>
									))}
								</div>
							)}
							{selectedUserIds.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-2">
									{selectedUserIds.map((userId) => {
										const user = userSearchResults.find(
											(u) => u.$id === userId,
										);
										return (
											<Badge
												key={userId}
												variant="secondary"
												className="flex items-center gap-1"
											>
												{user?.fullName || user?.email || userId}
												<button
													onClick={() => removeUser(userId)}
													className="ml-1 hover:text-red-600"
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

					{/* Footer */}
					<div className="glass-dialog-footer-end gap-3">
						<Button
							variant="outline"
							onClick={() => {
								setIsCreateDialogOpen(false);
								setIsEditDialogOpen(false);
								setRuleToEdit(null);
							}}
							className="primary-btn px-3 sm:px-4"
							disabled={isSaving}
						>
							<Ban className="w-4 h-4" />
							Cancel
						</Button>
						<Button
							onClick={handleSave}
							className="primary-btn px-3 sm:px-4"
							disabled={isSaving}
						>
							{isSaving ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
									Saving...
								</>
							) : (
								<>
									<Check className="w-4 h-4" />
									{ruleToEdit ? "Update Rule" : "Create Rule"}
								</>
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="overflow-hidden p-0 shadow-xl sm:max-w-md">
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
						<div className="flex items-center gap-3">
							<Button
								variant="outline"
								onClick={() => setIsDeleteDialogOpen(false)}
								className="primary-btn px-3 sm:px-4"
								disabled={isDeleting}
							>
								<Ban className="w-4 h-4" />
								Cancel
							</Button>
							<Button
								onClick={confirmDelete}
								className="primary-btn px-3 sm:px-4 bg-red-600 hover:bg-red-700"
								disabled={isDeleting}
							>
								{isDeleting ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
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
