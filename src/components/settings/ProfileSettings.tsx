"use client";

import { Save, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fetcher, swrKeys } from "@/lib/swr-config";

type ProfileUser = {
	$id?: string;
	accountId?: string;
	fullName?: string;
	name?: string;
	email?: string;
	division?: string;
	divisionLabel?: string;
	department?: string;
	departmentLabel?: string;
	role?: string;
};

function pickProfileUser(payload: unknown): ProfileUser | null {
	if (!payload || typeof payload !== "object") return null;
	const record = payload as Record<string, unknown>;
	if (record.$id != null || record.fullName != null || record.email != null) {
		return record as ProfileUser;
	}
	if (record.user && typeof record.user === "object") {
		return record.user as ProfileUser;
	}
	if (record.data && typeof record.data === "object") {
		return record.data as ProfileUser;
	}
	return null;
}

function displayValue(...candidates: Array<string | undefined>): string {
	for (const value of candidates) {
		const trimmed = String(value || "").trim();
		if (trimmed) return trimmed;
	}
	return "";
}

const ProfileSettings = () => {
	const { user: authUser, setUser, refreshUser } = useAuth();
	const { toast } = useToast();
	const {
		data: currentUserResponse,
		isLoading: currentUserLoading,
		mutate,
	} = useSWR(swrKeys.currentUser(), fetcher, {
		revalidateOnFocus: false,
		revalidateOnReconnect: true,
	});

	const profileUser = useMemo(
		() =>
			pickProfileUser(currentUserResponse) ??
			(authUser as ProfileUser | null) ??
			null,
		[currentUserResponse, authUser],
	);

	const [isSaving, setIsSaving] = useState(false);
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [department, setDepartment] = useState("");
	const [division, setDivision] = useState("");
	const [role, setRole] = useState("");

	const loadedFullName = displayValue(profileUser?.fullName, profileUser?.name);
	const loadedEmail = displayValue(profileUser?.email);
	const loadedDepartment = displayValue(
		profileUser?.departmentLabel,
		profileUser?.department,
	);
	const loadedDivision = displayValue(
		profileUser?.divisionLabel,
		profileUser?.division,
	);
	const loadedRole = displayValue(profileUser?.role);

	useEffect(() => {
		if (!loadedFullName && !loadedEmail) return;
		setFullName(loadedFullName);
		setEmail(loadedEmail);
		setDepartment(loadedDepartment);
		setDivision(loadedDivision);
		setRole(loadedRole);
		// Primitive source fields only — do not reset while the user is typing.
	}, [
		loadedFullName,
		loadedEmail,
		loadedDepartment,
		loadedDivision,
		loadedRole,
	]);

	const handleSave = async () => {
		const trimmedName = fullName.trim();
		if (!trimmedName) {
			toast({
				title: "Name required",
				description: "Enter your full name before saving.",
				variant: "destructive",
			});
			return;
		}

		try {
			setIsSaving(true);
			const res = await fetch("/api/user/profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ fullName: trimmedName }),
			});
			const payload = (await res.json().catch(() => ({}))) as {
				error?: string;
			};
			if (!res.ok) {
				throw new Error(payload.error || "Failed to update profile");
			}

			setFullName(trimmedName);
			if (authUser) {
				setUser({ ...authUser, name: trimmedName });
			}
			await mutate();
			await refreshUser();

			toast({
				title: "Profile Updated",
				description: "Your profile information has been saved successfully.",
			});
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to update profile. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const disableSave = isSaving || currentUserLoading || !profileUser;

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<User className="h-5 w-5 text-[#0f5384]" />
				<span className="text-sm font-medium text-navy">
					Personal Information
				</span>
			</div>

			<div className="space-y-3">
				<div>
					<Label htmlFor="fullName" className="text-sm text-slate-700">
						Full Name
					</Label>
					<Input
						id="fullName"
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						className="mt-1"
						autoComplete="name"
						disabled={currentUserLoading}
					/>
				</div>

				<div>
					<Label htmlFor="email" className="text-sm text-slate-700">
						Email Address
					</Label>
					<Input
						id="email"
						type="email"
						value={email}
						readOnly
						disabled
						className="mt-1"
						autoComplete="email"
					/>
					<p className="mt-1 text-xs text-slate-500">
						Email cannot be changed here. Ask an administrator if you need a new
						address.
					</p>
				</div>

				<div>
					<Label htmlFor="department" className="text-sm text-slate-700">
						Department
					</Label>
					<Input
						id="department"
						value={department}
						className="mt-1"
						disabled
						readOnly
					/>
				</div>

				<div>
					<Label htmlFor="division" className="text-sm text-slate-700">
						Division
					</Label>
					<Input
						id="division"
						value={division}
						className="mt-1"
						disabled
						readOnly
					/>
				</div>

				<div>
					<Label htmlFor="role" className="text-sm text-slate-700">
						Role
					</Label>
					<Input id="role" value={role} className="mt-1" disabled readOnly />
					<p className="mt-1 text-xs text-slate-500">
						Department, division, and role are assigned by an administrator.
					</p>
				</div>
			</div>

			<div className="flex items-center justify-end">
				<Button
					onClick={handleSave}
					disabled={disableSave}
					className="primary-btn px-3 sm:px-4"
				>
					<Save className="h-4 w-4" />
					{isSaving ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</div>
	);
};

export default ProfileSettings;
