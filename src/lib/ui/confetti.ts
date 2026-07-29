/**
 * Lightweight viewport confetti — no external package.
 * Safe to call from the browser after a successful action.
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
