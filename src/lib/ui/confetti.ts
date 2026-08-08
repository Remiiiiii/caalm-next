/**
 * Lightweight viewport confetti — no external package.
 * Safe to call from the browser after a successful action.
 * Pieces use the CAALM brand palette.
 */

type Particle = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	w: number;
	h: number;
	rotation: number;
	vr: number;
	color: string;
	opacity: number;
};

const COLORS = [
	"#078FAB",
	"#0f5384",
	"#03afbf",
	"#10B981",
	"#F59E0B",
	"#EC4899",
	"#6366F1",
];

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

export function fireConfetti(options?: {
	durationMs?: number;
	particleCount?: number;
}): void {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}

	const durationMs = options?.durationMs ?? 2800;
	const particleCount = options?.particleCount ?? 120;
	const canvas = document.createElement("canvas");
	canvas.setAttribute("aria-hidden", "true");
	canvas.style.cssText =
		"position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99999;";
	document.body.appendChild(canvas);

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		canvas.remove();
		return;
	}

	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const resize = () => {
		canvas.width = Math.floor(window.innerWidth * dpr);
		canvas.height = Math.floor(window.innerHeight * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	};
	resize();

	const originX = window.innerWidth / 2;
	const originY = window.innerHeight * 0.28;
	const particles: Particle[] = Array.from({ length: particleCount }, () => {
		const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
		const speed = 6 + Math.random() * 10;
		return {
			x: originX + (Math.random() - 0.5) * 40,
			y: originY,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			w: 6 + Math.random() * 6,
			h: 8 + Math.random() * 8,
			rotation: Math.random() * Math.PI * 2,
			vr: (Math.random() - 0.5) * 0.3,
			color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
			opacity: 1,
		};
	});

	const start = performance.now();
	let frame = 0;

	const tick = (now: number) => {
		const elapsed = now - start;
		const t = Math.min(1, elapsed / durationMs);
		ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

		for (const p of particles) {
			p.vy += 0.18;
			p.vx *= 0.99;
			p.x += p.vx;
			p.y += p.vy;
			p.rotation += p.vr;
			p.opacity = 1 - t;

			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(p.rotation);
			ctx.globalAlpha = Math.max(0, p.opacity);
			ctx.fillStyle = p.color;
			ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
			ctx.restore();
		}

		if (elapsed < durationMs) {
			frame = requestAnimationFrame(tick);
		} else {
			cancelAnimationFrame(frame);
			window.removeEventListener("resize", resize);
			canvas.remove();
		}
	};

	window.addEventListener("resize", resize);
	frame = requestAnimationFrame(tick);
}

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
		const color = CAALM_CONFETTI_COLORS[i % CAALM_CONFETTI_COLORS.length]!;
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
