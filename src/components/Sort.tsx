"use client";

import {
	ArrowDown,
	ArrowDownAZ,
	ArrowUp,
	ArrowUpDown,
	ArrowUpZA,
	ChevronDown,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { sortTypes } from "../../constants";
import { Button } from "@/components/ui/button";
import {
	AppDropdownMenuContent,
	AppDropdownMenuTrigger,
	DropdownMenu,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const SORT_FIELDS = [
	{ key: "$createdAt", label: "Date created", kind: "time" as const },
	{ key: "name", label: "Name", kind: "alpha" as const },
	{ key: "size", label: "Size", kind: "numeric" as const },
];

function parseSort(value: string): { key: string; direction: "asc" | "desc" } {
	const lastDash = value.lastIndexOf("-");
	if (lastDash <= 0) {
		return { key: "$createdAt", direction: "desc" };
	}
	const key = value.slice(0, lastDash);
	const direction = value.slice(lastDash + 1) === "asc" ? "asc" : "desc";
	return { key, direction };
}

const Sort = () => {
	const path = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const current =
		searchParams?.get("sort") || sortTypes[0]?.value || "$createdAt-desc";
	const { key: sortKey, direction } = parseSort(current);

	const handleSort = (key: string, nextDirection: "asc" | "desc") => {
		const params = new URLSearchParams(searchParams?.toString() || "");
		params.set("sort", `${key}-${nextDirection}`);
		router.push(`${path}?${params.toString()}`);
	};

	return (
		<DropdownMenu>
			<AppDropdownMenuTrigger
				asChild
				className="border-0 bg-transparent p-0 shadow-none ring-0 hover:bg-transparent data-[state=open]:bg-transparent"
			>
				<Button
					variant="ghost"
					size="sm"
					className="btn-primary h-8 border-0 px-3 shadow-none focus-visible:ring-0 sm:px-4"
				>
					<ArrowUpDown className="h-4 w-4" />
					<span className="hidden sm:inline">Sort by</span>
					<ChevronDown className="h-4 w-4" />
				</Button>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent align="end" className="w-72 p-1">
				{SORT_FIELDS.map((field) => {
					const active = sortKey === field.key;
					const ascLabel =
						field.kind === "alpha"
							? "A to Z"
							: field.kind === "numeric"
								? "lowest first"
								: "oldest first";
					const descLabel =
						field.kind === "alpha"
							? "Z to A"
							: field.kind === "numeric"
								? "highest first"
								: "newest first";
					return (
						<div
							key={field.key}
							className={cn(
								"flex items-center justify-between gap-3 rounded-lg px-3 py-2",
								active && "bg-blue-50",
							)}
						>
							<p
								className={cn(
									"text-sm font-medium",
									active ? "text-[#0f5384]" : "text-slate-700",
								)}
							>
								{field.label}
							</p>
							<div className="flex items-center gap-1">
								<button
									type="button"
									aria-label={`${field.label} ${ascLabel}`}
									aria-pressed={active && direction === "asc"}
									onClick={() => handleSort(field.key, "asc")}
									className={cn(
										"inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors duration-200",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
										active && direction === "asc"
											? "bg-white text-[#0f5384] shadow-sm"
											: "text-slate-400 hover:text-slate-700",
									)}
								>
									{field.kind === "alpha" ? (
										<ArrowDownAZ className="h-4 w-4" />
									) : (
										<ArrowDown className="h-4 w-4" />
									)}
								</button>
								<button
									type="button"
									aria-label={`${field.label} ${descLabel}`}
									aria-pressed={active && direction === "desc"}
									onClick={() => handleSort(field.key, "desc")}
									className={cn(
										"inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors duration-200",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
										active && direction === "desc"
											? "bg-white text-[#0f5384] shadow-sm"
											: "text-slate-400 hover:text-slate-700",
									)}
								>
									{field.kind === "alpha" ? (
										<ArrowUpZA className="h-4 w-4" />
									) : (
										<ArrowUp className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>
					);
				})}
			</AppDropdownMenuContent>
		</DropdownMenu>
	);
};

export default Sort;
