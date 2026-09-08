import Image from "next/image";

type BriefingNewsIconProps = {
	className?: string;
};

/** Newspaper glyph for the Briefing header. Asset: `/assets/icons/newspaper2.png`. */
export function BriefingNewsIcon({ className }: BriefingNewsIconProps) {
	return (
		<Image
			src="/assets/icons/newspaper3.png"
			alt=""
			width={40}
			height={32}
			unoptimized
			className={className}
			aria-hidden
		/>
	);
}
