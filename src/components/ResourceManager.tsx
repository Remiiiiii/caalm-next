"use client";

import {
	AlertCircle,
	Building2,
	CheckCircle,
	Edit,
	Loader2,
	MapPin,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AppDialog } from "@/components/ui/app-dialog";
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

interface CalendarResource {
	$id: string;
	name: string;
	type: "room" | "equipment";
	description?: string;
	location?: string;
	capacity?: number;
	features?: string[];
	requiresApproval: boolean;
	approvalWorkflowId?: string;
	organizationId: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

interface ResourceManagerProps {
	onResourceCreated?: (resource: CalendarResource) => void;
	onResourceUpdated?: (resource: CalendarResource) => void;
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({
	onResourceCreated,
	onResourceUpdated,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [resources, setResources] = useState<CalendarResource[]>([]);
	const [loading, setLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		type: "room" as "room" | "equipment",
		description: "",
		location: "",
		capacity: "",
		features: [] as string[],
		requiresApproval: false,
	});
	const { toast } = useToast();

	const fetchResources = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/calendar/resources");
			if (response.ok) {
				const data = await response.json();
				setResources(data.resources || []);
			}
		} catch (error) {
			console.error(
				"[CLIENT] ResourceManager] Error fetching resources:",
				error,
			);
			toast({
				title: "Error",
				description: "Failed to load resources",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		if (isOpen) {
			fetchResources();
		}
	}, [isOpen, fetchResources]);

	const handleCreate = async () => {
		if (!formData.name.trim()) {
			toast({
				title: "Validation Error",
				description: "Resource name is required",
				variant: "destructive",
			});
			return;
		}

		try {
			setCreating(true);
			const response = await fetch("/api/calendar/resources", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...formData,
					capacity: formData.capacity
						? parseInt(formData.capacity, 10)
						: undefined,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				toast({
					title: "Success",
					description: "Resource created successfully",
				});
				setFormData({
					name: "",
					type: "room",
					description: "",
					location: "",
					capacity: "",
					features: [],
					requiresApproval: false,
				});
				await fetchResources();
				onResourceCreated?.(data.resource);
			} else {
				const error = await response.json();
				toast({
					title: "Error",
					description: error.message || "Failed to create resource",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error(
				"[CLIENT] ResourceManager] Error creating resource:",
				error,
			);
			toast({
				title: "Error",
				description: "Failed to create resource",
				variant: "destructive",
			});
		} finally {
			setCreating(false);
		}
	};

	const commonFeatures = [
		"projector",
		"whiteboard",
		"video-conference",
		"phone",
		"wifi",
		"catering",
		"parking",
	];

	const toggleFeature = (feature: string) => {
		setFormData({
			...formData,
			features: formData.features.includes(feature)
				? formData.features.filter((f) => f !== feature)
				: [...formData.features, feature],
		});
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
				<Building2 className="h-4 w-4" />
				Manage Resources
			</Button>
			<AppDialog
				open={isOpen}
				onOpenChange={setIsOpen}
				size="form"
				className="max-w-175 max-h-[90vh]"
				icon={<Building2 className="h-5 w-5" />}
				title="Resource Management"
				description="Manage meeting rooms and equipment for event bookings"
				pending={creating}
				footer={
					<>
						<Button
							type="button"
							variant="ghost"
							className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
							onClick={() => setIsOpen(false)}
						>
							Close
						</Button>
						<Button
							type="button"
							className="btn-primary"
							onClick={handleCreate}
							disabled={creating || !formData.name.trim()}
						>
							{creating ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Plus className="h-4 w-4" />
							)}
							{creating ? "Creating..." : "Create Resource"}
						</Button>
					</>
				}
			>
				<div className="space-y-6 pb-1">
					{/* Create New Resource Form */}
					<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
						<Label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
							<Plus className="w-4 h-4 text-blue-600" />
							Create New Resource
						</Label>

						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label
										htmlFor="resource-name"
										className="text-sm text-slate-700 mb-1 block"
									>
										Resource Name *
									</Label>
									<Input
										id="resource-name"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										placeholder="e.g., Conference Room A"
										className="bg-white border-slate-300"
									/>
								</div>

								<div>
									<Label
										htmlFor="resource-type"
										className="text-sm text-slate-700 mb-1 block"
									>
										Type *
									</Label>
									<Select
										value={formData.type}
										onValueChange={(value) =>
											setFormData({
												...formData,
												type: value as "room" | "equipment",
											})
										}
									>
										<SelectTrigger className="bg-white border-slate-300">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="room">Room</SelectItem>
											<SelectItem value="equipment">Equipment</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div>
								<Label
									htmlFor="resource-description"
									className="text-sm text-slate-700 mb-1 block"
								>
									Description
								</Label>
								<Textarea
									id="resource-description"
									value={formData.description}
									onChange={(e) =>
										setFormData({ ...formData, description: e.target.value })
									}
									placeholder="Optional description"
									rows={2}
									className="bg-white border-slate-300"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label
										htmlFor="resource-location"
										className="text-sm text-slate-700 mb-1 block"
									>
										Location
									</Label>
									<Input
										id="resource-location"
										value={formData.location}
										onChange={(e) =>
											setFormData({ ...formData, location: e.target.value })
										}
										placeholder="Building, floor, etc."
										className="bg-white border-slate-300"
									/>
								</div>

								{formData.type === "room" && (
									<div>
										<Label
											htmlFor="resource-capacity"
											className="text-sm text-slate-700 mb-1 block"
										>
											Capacity
										</Label>
										<Input
											id="resource-capacity"
											type="number"
											min="1"
											value={formData.capacity}
											onChange={(e) =>
												setFormData({ ...formData, capacity: e.target.value })
											}
											placeholder="Max number of people"
											className="bg-white border-slate-300"
										/>
									</div>
								)}
							</div>

							{formData.type === "room" && (
								<div>
									<Label className="text-sm text-slate-700 mb-2 block">
										Features
									</Label>
									<div className="flex flex-wrap gap-2">
										{commonFeatures.map((feature) => (
											<div key={feature} className="flex items-center gap-2">
												<Checkbox
													id={`feature-${feature}`}
													checked={formData.features.includes(feature)}
													onCheckedChange={() => toggleFeature(feature)}
												/>
												<Label
													htmlFor={`feature-${feature}`}
													className="text-xs text-slate-700 cursor-pointer capitalize"
												>
													{feature.replace("-", " ")}
												</Label>
											</div>
										))}
									</div>
								</div>
							)}

							<div className="flex items-center gap-2">
								<Checkbox
									id="requires-approval"
									checked={formData.requiresApproval}
									onCheckedChange={(checked) =>
										setFormData({
											...formData,
											requiresApproval: checked as boolean,
										})
									}
								/>
								<Label
									htmlFor="requires-approval"
									className="text-sm text-slate-700 cursor-pointer"
								>
									Requires approval for bookings
								</Label>
							</div>
						</div>
					</div>

					{/* Existing Resources List */}
					{loading ? (
						<div className="text-center py-8 text-slate-500">
							Loading resources...
						</div>
					) : resources.length > 0 ? (
						<div className="space-y-3">
							<Label className="text-sm font-semibold text-slate-700">
								Available Resources
							</Label>
							{resources.map((resource) => (
								<div
									key={resource.$id}
									className="bg-white border border-slate-200 rounded-lg p-4"
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-2">
												<span className="font-medium text-slate-700">
													{resource.name}
												</span>
												<Badge variant="secondary" className="text-xs">
													{resource.type === "room" ? "Room" : "Equipment"}
												</Badge>
												{resource.requiresApproval && (
													<Badge variant="outline" className="text-xs">
														<AlertCircle className="w-3 h-3 mr-1" />
														Requires Approval
													</Badge>
												)}
												{!resource.isActive && (
													<Badge variant="destructive" className="text-xs">
														Inactive
													</Badge>
												)}
											</div>
											{resource.description && (
												<p className="text-sm text-slate-500 mb-2">
													{resource.description}
												</p>
											)}
											<div className="flex items-center gap-4 text-xs text-slate-600">
												{resource.location && (
													<div className="flex items-center gap-1">
														<MapPin className="w-3 h-3" />
														{resource.location}
													</div>
												)}
												{resource.capacity && (
													<div className="flex items-center gap-1">
														<Users className="w-3 h-3" />
														Capacity: {resource.capacity}
													</div>
												)}
												{resource.features && resource.features.length > 0 && (
													<div className="flex items-center gap-1">
														<CheckCircle className="w-3 h-3" />
														{resource.features.length} feature
														{resource.features.length !== 1 ? "s" : ""}
													</div>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2 ml-4">
											<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
												<Edit className="w-4 h-4 text-[#0f5384]" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0 hover:bg-red-50"
											>
												<Trash2 className="w-4 h-4 text-red" />
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-slate-500">
							No resources yet. Create one to get started.
						</div>
					)}
				</div>
			</AppDialog>
		</>
	);
};
