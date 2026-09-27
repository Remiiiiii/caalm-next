import { cn } from "@/lib/utils";

type StaticWaveBackdropProps = {
	/** Pin behind scrolling content (dashboard-style pages). */
	fixed?: boolean;
	/** Match legacy wave video at 60% opacity. */
	muted?: boolean;
	className?: string;
};

/** CSS-only wave-style backdrop — no video download (saves CDN bandwidth). */
export default function StaticWaveBackdrop({
	fixed = false,
	muted = false,
	className,
}: StaticWaveBackdropProps) {
	return (
		<div
			aria-hidden
			className={cn(
				"pointer-events-none overflow-hidden",
				fixed ? "fixed inset-0 z-[-10]" : "absolute inset-0 z-0",
				muted && "opacity-60",
				className,
			)}
		>
			<div className="absolute inset-0 bg-slate-50" />
			<div className="absolute -top-16 -left-10 h-[28rem] w-[28rem] rounded-full bg-[#00c1cb]/12 blur-3xl" />
			<div className="absolute -bottom-16 -right-8 h-[32rem] w-[32rem] rounded-full bg-[#0f5384]/10 blur-3xl" />
			<div className="absolute top-1/3 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#00c1cb]/8 blur-3xl" />
		</div>
	);
}
