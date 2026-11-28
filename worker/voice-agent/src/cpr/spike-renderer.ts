/**
 * Slice-1 stand-in renderer: proves LiveKit audio→video wiring without a GPU
 * model. Product fidelity (near-photoreal) lands in slice 2 via a real
 * VideoGenerator plugged into the same LocalAvatarRunner hooks.
 */

export type SpikeRendererOptions = {
	width: number;
	height: number;
	/** 0 quiet … 1 full mouth open from audio energy. */
	mouthOpen: number;
	/** Wall-clock ms for subtle idle sway. */
	nowMs: number;
};

/** RMS of interleaved Int16 PCM → 0..1 mouth aperture. */
export function mouthOpenFromPcm(pcm: Int16Array): number {
	if (pcm.length === 0) return 0;
	let sum = 0;
	for (let i = 0; i < pcm.length; i++) {
		const s = pcm[i]! / 32768;
		sum += s * s;
	}
	const rms = Math.sqrt(sum / pcm.length);
	return Math.min(1, rms * 8);
}

/**
 * Fill an RGBA buffer with a centered portrait oval, soft background, and a
 * mouth ellipse that scales with `mouthOpen`. Not photoreal; pipeline only.
 */
export function renderSpikeFrame(opts: SpikeRendererOptions): Uint8Array {
	const { width, height, mouthOpen, nowMs } = opts;
	const out = new Uint8Array(width * height * 4);
	const cx = width / 2;
	const cy = height / 2 + Math.sin(nowMs / 1800) * (height * 0.008);
	const faceRx = width * 0.28;
	const faceRy = height * 0.36;
	const mouthCy = cy + faceRy * 0.42;
	const mouthRx = faceRx * (0.22 + mouthOpen * 0.18);
	const mouthRy = faceRy * (0.04 + mouthOpen * 0.14);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const nx = (x - cx) / faceRx;
			const ny = (y - cy) / faceRy;
			const inFace = nx * nx + ny * ny <= 1;

			const mx = (x - cx) / mouthRx;
			const my = (y - mouthCy) / Math.max(mouthRy, 1);
			const inMouth = mx * mx + my * my <= 1;

			if (inMouth && mouthOpen > 0.05) {
				out[i] = 40;
				out[i + 1] = 24;
				out[i + 2] = 32;
				out[i + 3] = 255;
			} else if (inFace) {
				// Warm skin-tone stand-in; shade by vertical position.
				const shade = 0.85 + 0.15 * (1 - (y - (cy - faceRy)) / (faceRy * 2));
				out[i] = Math.round(210 * shade);
				out[i + 1] = Math.round(170 * shade);
				out[i + 2] = Math.round(145 * shade);
				out[i + 3] = 255;
			} else {
				// Soft brand-teal wash behind the oval.
				const t = y / height;
				out[i] = Math.round(15 + t * 20);
				out[i + 1] = Math.round(60 + t * 40);
				out[i + 2] = Math.round(100 + t * 30);
				out[i + 3] = 255;
			}
		}
	}
	return out;
}
