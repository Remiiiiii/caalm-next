"use client";

import { Edit, Eye, Link, UserPlus } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
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

export type SharePermissionLevel = "view" | "edit";

export interface ShareEventDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	permissions: SharePermissionLevel;
	onPermissionsChange: (value: SharePermissionLevel) => void;
	onShare: () => void;
}

export function ShareEventDialog({
	open,
	onOpenChange,
	permissions,
	onPermissionsChange,
	onShare,
}: ShareEventDialogProps): React.ReactElement {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Share Event</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label className="block text-sm font-medium text-slate-700 mb-1">
							Share with users
						</Label>
						<div className="flex space-x-2">
							<Input placeholder="Search users..." className="flex-1" />
							<Button size="sm">
								<UserPlus className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<div>
						<Label className="block text-sm font-medium text-slate-700 mb-1">
							Permissions
						</Label>
						<Select
							value={permissions}
							onValueChange={(value: SharePermissionLevel) =>
								onPermissionsChange(value)
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="view">
									<div className="flex items-center space-x-2">
										<Eye className="h-4 w-4" />
										<span>View only</span>
									</div>
								</SelectItem>
								<SelectItem value="edit">
									<div className="flex items-center space-x-2">
										<Edit className="h-4 w-4" />
										<span>Can edit</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center space-x-2">
						<Button variant="outline" onClick={onShare} className="flex-1">
							<Link className="h-4 w-4" />
							Generate Link
						</Button>
					</div>

					<div className="flex justify-end space-x-2">
						<Button onClick={onShare}>Share</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
