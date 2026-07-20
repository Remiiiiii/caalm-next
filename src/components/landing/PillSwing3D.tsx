"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PillSwing3DProps {
	children: ReactNode;
	className?: string;
}

export default function PillSwing3D({ children, className }: PillSwing3DProps) {
	const reduceMotion = useReducedMotion();

	return (
		<span className="inline-block align-baseline [perspective:1200px]">
			<motion.span
				className={cn(
					"inline-flex items-center rounded-full border-2 border-[#03AFBF]/70 bg-white/80 px-3.5 py-1 shadow-[0_8px_24px_rgba(15,83,132,0.22),0_2px_6px_rgba(0,0,0,0.08)] backdrop-blur-sm",
					className,
				)}
				style={{ transformStyle: "preserve-3d", display: "inline-flex" }}
				animate={
					reduceMotion
						? undefined
						: {
								rotateY: [-16, 16, -16],
								rotateX: [-6, 6, -6],
							}
				}
				transition={
					reduceMotion
						? undefined
						: {
								duration: 3.5,
								repeat: Infinity,
								ease: "easeInOut",
							}
				}
			>
				{children}
			</motion.span>
		</span>
	);
}
