import { loadFont } from "@remotion/google-fonts/Inter";
import {
	AbsoluteFill,
	Composition,
	Easing,
	Img,
	interpolate,
	Sequence,
	staticFile,
	useCurrentFrame,
} from "remotion";

const { fontFamily } = loadFont("normal", {
	weights: ["400", "500", "600", "700"],
	subsets: ["latin"],
});

const FPS = 30;
const DURATION_SECONDS = 10;
const DURATION_IN_FRAMES = FPS * DURATION_SECONDS;

const Particles: React.FC<{ count?: number }> = ({ count = 30 }) => {
	const frame = useCurrentFrame();
	const particles = Array.from({ length: count }).map((_, i) => {
		const x = (i * 137) % 100;
		const startY = (i * 93) % 100;
		const speed = 0.1 + (i % 5) * 0.05;
		const size = 3 + (i % 5);

		// y moves from startY upwards
		const y = (startY - frame * speed + 100) % 100;
		const opacity = Math.sin((frame + i * 20) * 0.03) * 0.4 + 0.1;

		return (
			<div
				key={i}
				style={{
					position: "absolute",
					left: `${x}%`,
					top: `${y}%`,
					width: size,
					height: size,
					borderRadius: "50%",
					backgroundColor:
						i % 2 === 0 ? "rgba(3,175,191,0.6)" : "rgba(255,255,255,0.8)",
					opacity,
					boxShadow: "0 0 4px rgba(255,255,255,0.5)",
				}}
			/>
		);
	});

	return (
		<div
			style={{
				position: "absolute",
				width: "100%",
				height: "100%",
				overflow: "hidden",
				pointerEvents: "none",
			}}
		>
			{particles}
		</div>
	);
};

const OpenScene: React.FC = () => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, 12, 60, 72], [0, 1, 1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const translateY = interpolate(frame, [0, 12, 60, 72], [12, 0, 0, -12], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.bezier(0.16, 1, 0.3, 1),
	});

	return (
		<div
			style={{
				position: "absolute",
				width: "100%",
				height: "100%",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				opacity,
				transform: `translateY(${translateY}px)`,
			}}
		>
			<div
				style={{
					position: "absolute",
					width: 800,
					height: 800,
					background:
						"radial-gradient(circle, rgba(3,175,191,0.15) 0%, rgba(3,175,191,0) 70%)",
					borderRadius: "50%",
				}}
			/>
			<Particles count={25} />
			<div
				style={{ display: "flex", alignItems: "center", gap: 24, zIndex: 1 }}
			>
				<Img
					src={staticFile("logo-brand.svg")}
					style={{ width: 80, height: 80 }}
				/>
				<h1
					style={{
						fontSize: 110,
						fontWeight: 700,
						margin: 0,
						background: "linear-gradient(90deg, #12477d, #03AFBF)",
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent",
						letterSpacing: "-0.02em",
					}}
				>
					CAALM
				</h1>
			</div>
		</div>
	);
};

const ScreenshotFrame: React.FC<{ src: string }> = ({ src }) => {
	const frame = useCurrentFrame();

	// 72 frames total for each montage beat
	const scale = interpolate(frame, [0, 72], [0.96, 1.04], {
		extrapolateRight: "clamp",
	});
	const rotateX = interpolate(frame, [0, 72], [4, -2], {
		extrapolateRight: "clamp",
	});
	const rotateY = interpolate(frame, [0, 72], [-4, 2], {
		extrapolateRight: "clamp",
	});

	const opacity = interpolate(frame, [0, 12, 60, 72], [0, 1, 1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const translateY = interpolate(frame, [0, 12, 60, 72], [16, 0, 0, -16], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.bezier(0.16, 1, 0.3, 1),
	});

	return (
		<div
			style={{
				position: "absolute",
				width: "100%",
				height: "100%",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				opacity,
				transform: `perspective(1200px) translateY(${translateY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
				transformStyle: "preserve-3d",
			}}
		>
			{/* Blurred background copy */}
			<Img
				src={staticFile(src)}
				style={{
					position: "absolute",
					width: "72%",
					filter: "blur(32px)",
					opacity: 0.45,
					transform: "translateZ(-100px) translateY(40px) scale(1.05)",
				}}
			/>
			{/* Glass frame */}
			<div
				style={{
					position: "relative",
					width: "78%",
					background: "rgba(255,255,255,0.55)",
					backdropFilter: "blur(12px)",
					border: "1px solid rgba(255,255,255,0.8)",
					boxShadow:
						"0 16px 40px 0 rgba(31,38,135,0.15), 0 0 0 1px #e2e8f0 inset",
					borderRadius: 12,
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
					transform: "translateZ(0px)",
				}}
			>
				{/* Cap bar */}
				<div style={{ height: 16, background: "#d6d7d8", width: "100%" }} />
				{/* Screenshot */}
				<Img
					src={staticFile(src)}
					style={{ width: "100%", display: "block" }}
				/>
			</div>
		</div>
	);
};

const CloseScene: React.FC = () => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, 12], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const translateY = interpolate(frame, [0, 12], [12, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.bezier(0.16, 1, 0.3, 1),
	});

	return (
		<div
			style={{
				position: "absolute",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "center",
				opacity,
				transform: `translateY(${translateY}px)`,
			}}
		>
			<div
				style={{
					position: "absolute",
					bottom: -200,
					width: "150%",
					height: 500,
					background:
						"radial-gradient(ellipse at top, rgba(3,175,191,0.15) 0%, rgba(3,175,191,0) 70%)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					width: 140,
					height: 1200,
					background:
						"linear-gradient(to top, rgba(3,175,191,0) 0%, rgba(255,255,255,0.9) 50%, rgba(3,175,191,0) 100%)",
					opacity: 0.6,
					transform: "rotate(20deg)",
				}}
			/>
			<Particles count={40} />

			<div
				style={{ display: "flex", alignItems: "center", gap: 20, zIndex: 1 }}
			>
				<Img
					src={staticFile("logo-brand.svg")}
					style={{ width: 70, height: 70 }}
				/>
				<h1
					style={{
						fontSize: 90,
						fontWeight: 700,
						margin: 0,
						background: "linear-gradient(90deg, #12477d, #03AFBF)",
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent",
						letterSpacing: "-0.02em",
					}}
				>
					CAALM
				</h1>
			</div>
			<p
				style={{
					marginTop: 28,
					fontSize: 34,
					fontWeight: 500,
					color: "#475569",
					letterSpacing: "0.01em",
					zIndex: 1,
				}}
			>
				Compliance, centralized.
			</p>
		</div>
	);
};

export const CaalmDemoScene: React.FC = () => {
	return (
		<AbsoluteFill
			style={{
				background:
					"linear-gradient(135deg, #fcfdff 0%, rgba(3, 175, 191, 0.05) 40%, rgba(14, 99, 143, 0.06) 70%, #f2f4f8 100%)",
				fontFamily,
			}}
		>
			{/* 0:00 - 0:02+ (cross dissolve out) */}
			<Sequence name="Open" from={0} durationInFrames={72} layout="none">
				<OpenScene />
			</Sequence>

			{/* 0:02 - 0:04+ */}
			<Sequence
				name="Beat 1 (Pending Approvals)"
				from={60}
				durationInFrames={72}
				layout="none"
			>
				<ScreenshotFrame src="demo-01-pending-approvals.png" />
			</Sequence>

			{/* 0:04 - 0:06+ */}
			<Sequence
				name="Beat 2 (Contracts)"
				from={120}
				durationInFrames={72}
				layout="none"
			>
				<ScreenshotFrame src="demo-07-contracts-full.png" />
			</Sequence>

			{/* 0:06 - 0:08+ */}
			<Sequence
				name="Beat 3 (Audit Charts)"
				from={180}
				durationInFrames={72}
				layout="none"
			>
				<ScreenshotFrame src="demo-05-audit-charts.png" />
			</Sequence>

			{/* 0:08 - 0:10 */}
			<Sequence name="Close" from={240} durationInFrames={60} layout="none">
				<CloseScene />
			</Sequence>
		</AbsoluteFill>
	);
};

export const MyComposition = () => {
	return (
		<Composition
			id="CaalmDemo"
			component={CaalmDemoScene}
			durationInFrames={DURATION_IN_FRAMES}
			fps={FPS}
			width={1920}
			height={1080}
		/>
	);
};
