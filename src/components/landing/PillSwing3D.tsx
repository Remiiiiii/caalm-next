"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PillSwing3DProps {
	children: ReactNode;
	className?: string;
}

export default function PillSwing3D({ children, className }: PillSwing3DProps) {
	const reduceMotion = useReducedMotion();
	const [canSwing, setCanSwing] = useState(false);

	// First paint stays static so layout/fonts settle before 3D transforms.
	useEffect(() => {
		if (reduceMotion) return;
		const id = window.setTimeout(() => setCanSwing(true), 400);
		return () => window.clearTimeout(id);
	}, [reduceMotion]);

	return (
		<span
			className="relative z-10 inline-block align-middle mx-1 [perspective:1200px]"
			style={{ WebkitTextFillColor: "#0f5384", color: "#0f5384" }}
		>
			<motion.span
				className={cn(
					"inline-flex items-center rounded-full border-2 border-[#03AFBF]/70 bg-white/90 px-3.5 py-1 font-extrabold text-[#0f5384] shadow-[0_8px_24px_rgba(15,83,132,0.22),0_2px_6px_rgba(0,0,0,0.08)]",
					className,
				)}
				style={{
					transformStyle: "preserve-3d",
					display: "inline-flex",
					WebkitTextFillColor: "#0f5384",
					color: "#0f5384",
				}}
				animate={
					canSwing
						? {
								rotateY: [-16, 16, -16],
								rotateX: [-6, 6, -6],
							}
						: { rotateY: 0, rotateX: 0 }
				}
				transition={
					canSwing
						? {
								duration: 3.5,
								repeat: Infinity,
								ease: "easeInOut",
							}
						: { duration: 0 }
				}
			>
				{children}
			</motion.span>
		</span>
	);
}
