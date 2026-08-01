"use client";

import Image from "next/image";
import { DEMO_TIPS } from "@/lib/demo/tour/tips";

const FAN_CARDS = DEMO_TIPS.filter(
	(tip): tip is typeof tip & { image: string } => Boolean(tip.image),
);

const CARD_W = 176;
const CARD_H = 112;

/** Start angle (deg) so the ring reads evenly around the Spline stage */
const START_ANGLE_DEG = -90;

/**
 * Independent cards arranged on a circle inside the Spline stage.
 * Absolute positioning — does not shift Spline vertically.
 */
export default function AuthTourFanCards() {
	const count = FAN_CARDS.length;

	return (
		<div aria-hidden className="absolute inset-0 z-[1] pointer-events-none">
			{FAN_CARDS.map((tip, index) => {
				const angleDeg = START_ANGLE_DEG + (360 / count) * index;
				const angleRad = (angleDeg * Math.PI) / 180;
				/* Left-anchored ring; stretch the right half farther out */
				const cos = Math.cos(angleRad);
				const sin = Math.sin(angleRad);
				const radiusX = cos >= 0 ? 40 : 22; // % — tighter ring toward circle center
				const radiusY = 24;
				const x = 28 + cos * radiusX;
				let y = 50 + sin * radiusY;
				/* Nudge individual cards without breaking the ring */
				if (tip.id === "demo-welcome") y -= 6;
				if (tip.id === "demo-licenses") y -= 5;
				/* Face slightly toward center */
				const faceRotate = angleDeg + 90;

				return (
					<div
						key={tip.id}
						className="absolute overflow-hidden rounded-lg border border-white/80 bg-white shadow-xl shadow-slate-900/25"
						style={{
							width: CARD_W,
							height: CARD_H,
							left: `${x}%`,
							top: `${y}%`,
							transform: `translate(-50%, -50%) rotate(${faceRotate * 0.15}deg)`,
							zIndex: index + 1,
						}}
					>
						<Image
							src={tip.image}
							alt=""
							width={CARD_W}
							height={CARD_H}
							className="h-full w-full object-cover object-top"
							priority={index === 0}
						/>
					</div>
				);
			})}
		</div>
	);
}
