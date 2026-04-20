"use client";

import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ImageGeneratorProps {
	onImageGenerated: (imageUrl: string, prompt: string) => void;
	initialPrompt?: string;
	disabled?: boolean;
}

export function ImageGenerator({
	onImageGenerated,
	initialPrompt = "",
	disabled = false,
}: ImageGeneratorProps) {
	const [prompt, setPrompt] = useState(initialPrompt);
	const [generating, setGenerating] = useState(false);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const { toast } = useToast();

	const handleGenerate = async () => {
		if (!prompt.trim()) {
			setError("Please enter a prompt");
			return;
		}

		setGenerating(true);
		setError(null);
		setImageUrl(null);

		try {
			const response = await fetch("/api/ai-image-generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ prompt: prompt.trim() }),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.error || "Failed to generate image");
			}

			setImageUrl(data.imageUrl);
			toast({
				title: "Image generated",
				description: `Generated in ${data.generationTime}ms`,
			});
		} catch (err: any) {
			setError(err.message || "Failed to generate image");
			toast({
				title: "Generation failed",
				description: err.message,
				variant: "destructive",
			});
		} finally {
			setGenerating(false);
		}
	};

	const handleAccept = () => {
		if (imageUrl) {
			onImageGenerated(imageUrl, prompt);
		}
	};

	const handleRegenerate = () => {
		setImageUrl(null);
		handleGenerate();
	};

	const handleReject = () => {
		setImageUrl(null);
		setError(null);
	};

	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor="prompt">Image Prompt</Label>
				<Input
					id="prompt"
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
					placeholder="Describe the image you want to generate..."
					disabled={generating || disabled}
					className="mt-1"
				/>
				<p className="text-xs text-light-200 mt-1">
					Be specific about style, colors, and composition
				</p>
			</div>

			<Button
				onClick={handleGenerate}
				disabled={generating || !prompt.trim() || disabled}
				className="w-full"
			>
				{generating ? (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Generating...
					</>
				) : (
					<>
						<RefreshCw className="mr-2 h-4 w-4" />
						Generate Image
					</>
				)}
			</Button>

			{error && (
				<div className="p-3 bg-red/10 border border-red/20 rounded-lg">
					<p className="text-sm text-red">{error}</p>
				</div>
			)}

			{imageUrl && (
				<div className="space-y-3">
					<div className="relative">
						<img
							src={imageUrl}
							alt="Generated"
							className="w-full rounded-lg border border-light-300"
						/>
					</div>
					<div className="flex gap-2">
						<Button onClick={handleAccept} className="flex-1" variant="default">
							<Check className="mr-2 h-4 w-4" />
							Use This Image
						</Button>
						<Button
							onClick={handleRegenerate}
							variant="outline"
							className="flex-1"
						>
							<RefreshCw className="mr-2 h-4 w-4" />
							Regenerate
						</Button>
						<Button onClick={handleReject} variant="outline" size="icon">
							<X className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
