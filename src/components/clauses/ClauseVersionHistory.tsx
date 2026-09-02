import { History } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Clause } from "@/types/clauses";
import {
	CAALM_BADGE_BASE,
	clauseCategoryLabel,
	clauseStatusBadgeClass,
	clauseStatusLabel,
} from "./ClauseEditorDialog";

type ClauseVersionHistoryProps = {
	familyId: string | null;
	/** Dialog is the original modal. Embedded sits in the detail pane. */
	variant?: "dialog" | "embedded";
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
};

function VersionList({
	versions,
	loading,
	error,
}: {
	versions: Clause[];
	loading: boolean;
	error: string | null;
}) {
	if (loading) {
		return <p className="text-sm text-slate-600">Loading versions…</p>;
	}
	if (error) {
		return <p className="text-sm text-red/80">{error}</p>;
	}
	if (versions.length === 0) {
		return <p className="text-sm text-slate-600">No versions found.</p>;
	}

	return (
		<div className="space-y-3">
			{versions.map((version) => (
				<div
					key={version.$id}
					className="rounded-lg border border-slate-200 bg-white p-4"
				>
					<div className="mb-2 flex flex-wrap items-center gap-2">
						<p className="text-sm font-medium text-slate-700">
							Version {version.version}
						</p>
						<span
							className={`${CAALM_BADGE_BASE} ${clauseStatusBadgeClass(version.status)}`}
						>
							{clauseStatusLabel(version.status)}
						</span>
						{version.isCurrent ? (
							<span
								className={`${CAALM_BADGE_BASE} bg-green/10 text-green border-green/20`}
							>
								Current
							</span>
						) : null}
						<span
							className={`${CAALM_BADGE_BASE} bg-blue/10 text-blue border-blue/20`}
						>
							{clauseCategoryLabel(version.category)}
						</span>
					</div>
					<p className="text-sm font-medium text-slate-700">{version.title}</p>
					<p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
						{version.body}
					</p>
					{version.changeNote ? (
						<p className="mt-2 text-xs text-slate-500">
							Note: {version.changeNote}
						</p>
					) : null}
				</div>
			))}
		</div>
	);
}

export function ClauseVersionHistory({
	familyId,
	variant = "dialog",
	open = false,
	onOpenChange,
}: ClauseVersionHistoryProps) {
	const [versions, setVersions] = useState<Clause[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const active = variant === "embedded" ? Boolean(familyId) : open;

	useEffect(() => {
		if (!active || !familyId) return;
		let cancelled = false;
		setLoading(true);
		setError(null);

		void fetch(`/api/clauses?familyId=${encodeURIComponent(familyId)}`)
			.then(async (response) => {
				const body = await response.json().catch(() => ({}));
				if (!response.ok) {
					throw new Error(body.error || "Could not load versions");
				}
				if (!cancelled) {
					setVersions(body.items || []);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(
						err instanceof Error ? err.message : "Could not load versions",
					);
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [active, familyId]);

	if (variant === "embedded") {
		if (!familyId) return null;
		return (
			<section className="space-y-3">
				<div className="flex items-center gap-2">
					<History className="h-4 w-4 text-[#0f5384]" />
					<h3 className="text-sm font-medium sidebar-gradient-text">
						Version history
					</h3>
				</div>
				<p className="text-xs text-slate-500">
					Older rows stay readable after a new version is published.
				</p>
				<VersionList versions={versions} loading={loading} error={error} />
			</section>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl sm:w-full">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<div className="flex items-center gap-3">
							<History className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Version history
							</DialogTitle>
						</div>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						Older rows stay readable after a new version is published.
					</p>
				</div>
				<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
					<VersionList versions={versions} loading={loading} error={error} />
				</div>
			</DialogContent>
		</Dialog>
	);
}
