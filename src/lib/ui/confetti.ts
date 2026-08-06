/**
 * Lightweight viewport confetti — no external package.
 * Pieces use the CAALM brand palette.
 */

const CAALM_CONFETTI_COLORS = [
	"#00C1CB",
	"#0f5384",
	"#0E638F",
	"#162768",
	"#03AFBF",
] as const;

type ConfettiOptions = {
	/** Particle count (default 80) */
	count?: number;
	/** Origin as 0–1 fractions of the viewport (default center-ish) */
	origin?: { x: number; y: number };
};

export function fireCaalmConfetti(options: ConfettiOptions = {}) {
	if (typeof document === "undefined") return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

	const count = options.count ?? 80;
	const originX = (options.origin?.x ?? 0.5) * window.innerWidth;
	const originY = (options.origin?.y ?? 0.35) * window.innerHeight;

	const root = document.createElement("div");
	root.setAttribute("aria-hidden", "true");
	root.style.cssText =
		"position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9999;";
	document.body.appendChild(root);

	const pieces: HTMLSpanElement[] = [];
	for (let i = 0; i < count; i++) {
		const piece = document.createElement("span");
		const color =
			CAALM_CONFETTI_COLORS[i % CAALM_CONFETTI_COLORS.length]!;
		const size = 6 + Math.random() * 8;
		const isRect = Math.random() > 0.45;
		const dx = (Math.random() - 0.5) * window.innerWidth * 0.55;
		/** Negative Y = upward burst, slight drift back down at the end */
		const rise = window.innerHeight * (0.28 + Math.random() * 0.38);
		const fall = rise * (0.15 + Math.random() * 0.25);
		const dy = -(rise - fall);
		const rot = (Math.random() - 0.5) * 540;
		const delay = Math.random() * 180;
		const duration = 2800 + Math.random() * 1600;

		piece.style.cssText = [
			"position:absolute",
			`left:${originX}px`,
			`top:${originY}px`,
			`width:${isRect ? size : size * 0.55}px`,
			`height:${size}px`,
			`background:${color}`,
			`border-radius:${isRect ? "2px" : "999px"}`,
			"opacity:1",
			"will-change:transform,opacity",
			`transform:translate(-50%,-50%) rotate(0deg)`,
			`transition:transform ${duration}ms cubic-bezier(0.12,0.6,0.2,1), opacity ${duration}ms ease-out`,
			`transition-delay:${delay}ms`,
		].join(";");

		root.appendChild(piece);
		pieces.push(piece);

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				piece.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}deg)`;
				piece.style.opacity = "0";
			});
		});
	}

	const cleanupMs = 4800;
	window.setTimeout(() => {
		root.remove();
	}, cleanupMs);
}
