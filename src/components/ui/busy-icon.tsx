import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shows `icon`, or a spinner of the same size while `busy`. */
export function BusyIcon({
	busy,
	icon: Icon,
	className = "h-4 w-4",
}: {
	busy: boolean;
	icon: LucideIcon;
	className?: string;
}) {
	return busy ? (
		<Loader2 className={cn(className, "animate-spin")} aria-hidden />
	) : (
		<Icon className={className} aria-hidden />
	);
}
