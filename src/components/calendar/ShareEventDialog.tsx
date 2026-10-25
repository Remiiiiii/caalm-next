"use client";

import { Edit, Eye, Link, Share2, UserPlus } from "lucide-react";
import type React from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
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
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			icon={<Share2 className="h-5 w-5" />}
			title="Share Event"
			footer={
				<>
					<Button
						type="button"
						variant="ghost"
						className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button type="button" className="btn-primary" onClick={onShare}>
						<Share2 className="h-4 w-4" />
						Share
					</Button>
				</>
			}
		>
			<div className="space-y-4 pb-1">
				<div>
					<Label className="mb-1 block text-sm font-medium text-slate-700">
						Share with users
					</Label>
					<div className="flex space-x-2">
						<Input placeholder="Search users..." className="flex-1" />
						<Button size="sm" type="button">
							<UserPlus className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<div>
					<Label className="mb-1 block text-sm font-medium text-slate-700">
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
					<Button
						type="button"
						variant="outline"
						onClick={onShare}
						className="flex-1"
					>
						<Link className="h-4 w-4" />
						Generate Link
					</Button>
				</div>
			</div>
		</AppDialog>
	);
}
