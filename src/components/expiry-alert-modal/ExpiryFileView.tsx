"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import ExpiryFilePdfViewer from "@/components/expiry-alert-modal/ExpiryFilePdfViewer";
import Avatar from "@/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProfilePictureUrl } from "@/lib/utils";

type ResolvedUser = {
	$id: string;
	fullName: string;
	profileImageId: string | null;
};

type ExpiryFileViewProps = {
	entityType: "contract" | "license";
	entityId: string;
	fileUrl: string | null;
	department: string | null;
	division: string | null;
	uploadedById: string | null;
	assignedManagerIds: string[];
	aiSynopsis: string | null;
	/** Lets the bridge cache a freshly generated synopsis for the rest of the session. */
	onSynopsisGenerated?: (synopsis: string, generatedAt: string) => void;
};

function Chip({ label, value }: { label: string; value: string }) {
	return (
		<span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
			<span className="font-medium text-slate-400">{label}</span>
			{value}
		</span>
	);
}

function AvatarStack({
	label,
	users,
}: {
	label: string;
	users: ResolvedUser[];
}) {
	if (users.length === 0) return null;
	return (
		<div className="flex items-center gap-2">
			<span className="text-xs font-medium text-slate-400">{label}</span>
			<TooltipProvider>
				<div className="flex items-center">
					{users.map((user, index) => (
						<Tooltip key={user.$id}>
							<TooltipTrigger asChild>
								<div className={index > 0 ? "-ml-2" : undefined}>
									<Avatar
										name={user.fullName}
										userId={user.$id}
										size="sm"
										imageUrl={getProfilePictureUrl(user.profileImageId)}
									/>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>{user.fullName}</p>
							</TooltipContent>
						</Tooltip>
					))}
				</div>
			</TooltipProvider>
		</div>
	);
}

export default function ExpiryFileView({
	entityType,
	entityId,
	fileUrl,
	department,
	division,
	uploadedById,
	assignedManagerIds,
	aiSynopsis,
	onSynopsisGenerated,
}: ExpiryFileViewProps) {
	const [users, setUsers] = useState<Record<string, ResolvedUser>>({});
	const [synopsis, setSynopsis] = useState(aiSynopsis);
	const [synopsisLoading, setSynopsisLoading] = useState(false);
	const [synopsisError, setSynopsisError] = useState(false);

	useEffect(() => {
		setSynopsis(aiSynopsis);
	}, [aiSynopsis]);

	useEffect(() => {
		const ids = Array.from(
			new Set(
				[uploadedById, ...assignedManagerIds].filter(
					(id): id is string => !!id,
				),
			),
		);
		if (ids.length === 0) return;
		let cancelled = false;
		void (async () => {
			try {
				const response = await fetch("/api/users/get-by-ids", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userIds: ids }),
				});
				if (!response.ok || cancelled) return;
				const resolved: ResolvedUser[] = await response.json();
				if (cancelled) return;
				setUsers(Object.fromEntries(resolved.map((user) => [user.$id, user])));
			} catch {
				// Avatars are a nice-to-have — leave the meta row without them.
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [uploadedById, assignedManagerIds.join(",")]);

	useEffect(() => {
		if (synopsis || synopsisLoading || !fileUrl) return;
		setSynopsisLoading(true);
		setSynopsisError(false);
		void (async () => {
			try {
				const response = await fetch("/api/expiry/synopsis", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ entityType, entityId, fileUrl }),
				});
				if (!response.ok) throw new Error("synopsis failed");
				const data = await response.json();
				setSynopsis(data.aiSynopsis);
				onSynopsisGenerated?.(data.aiSynopsis, data.aiSynopsisGeneratedAt);
			} catch {
				setSynopsisError(true);
			} finally {
				setSynopsisLoading(false);
			}
		})();
		// Intentionally only re-runs when the item itself changes.
	}, [entityType, entityId, fileUrl]);

	const uploadedBy = uploadedById ? users[uploadedById] : undefined;
	const assignedManagers = assignedManagerIds
		.map((id) => users[id])
		.filter((user): user is ResolvedUser => !!user);

	return (
		<div className="flex min-h-0 flex-col gap-4">
			<AnimatePresence>
				{(department ||
					division ||
					uploadedBy ||
					assignedManagers.length > 0) && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.4 }}
						className="flex flex-wrap items-center gap-3"
					>
						{department && <Chip label="Dept" value={department} />}
						{division && division !== department && (
							<Chip label="Division" value={division} />
						)}
						{uploadedBy && (
							<AvatarStack label="Uploaded by" users={[uploadedBy]} />
						)}
						<AvatarStack label="Assigned to" users={assignedManagers} />
					</motion.div>
				)}
			</AnimatePresence>

			{fileUrl ? (
				<ExpiryFilePdfViewer fileUrl={fileUrl} />
			) : (
				<div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
					No document on file for this record.
				</div>
			)}

			<div>
				<p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
					Smart Summary
				</p>
				<AnimatePresence mode="wait">
					{synopsisLoading ? (
						<motion.p
							key="loading"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.3 }}
							className="text-sm text-slate-400"
						>
							Reading the document…
						</motion.p>
					) : synopsisError ? (
						<motion.p
							key="error"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.3 }}
							className="text-sm text-slate-400"
						>
							Couldn&apos;t generate a synopsis for this document.
						</motion.p>
					) : synopsis ? (
						<motion.p
							key="synopsis"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.4 }}
							className="whitespace-pre-line text-sm leading-relaxed text-slate-600"
						>
							{synopsis}
						</motion.p>
					) : (
						<motion.p
							key="none"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.3 }}
							className="text-sm text-slate-400"
						>
							No synopsis available.
						</motion.p>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
