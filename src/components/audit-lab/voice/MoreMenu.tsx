import {
	Captions,
	Download,
	MoreHorizontal,
	Pause,
	Play,
	ShieldHalf,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MoreMenu({
	isFacilitator,
	isPaused,
	onTogglePause,
	captionsOn,
	onToggleCaptions,
	voiceAnonOn,
	onToggleVoiceAnon,
	onDownloadTranscript,
}: {
	isFacilitator: boolean;
	isPaused: boolean;
	onTogglePause: () => void;
	captionsOn: boolean;
	onToggleCaptions: () => void;
	voiceAnonOn: boolean;
	onToggleVoiceAnon: () => void;
	onDownloadTranscript: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="voice-call-control-btn"
					aria-label="More options"
				>
					<MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="voice-call-popover w-64 border-none p-1.5 backdrop-blur-none"
			>
				{isFacilitator ? (
					<>
						<DropdownMenuItem
							className="voice-call-menu-item gap-2"
							onSelect={() => onTogglePause()}
						>
							{isPaused ? (
								<Play className="h-4 w-4" aria-hidden />
							) : (
								<Pause className="h-4 w-4" aria-hidden />
							)}
							{isPaused ? "Resume interview" : "Pause interview"}
						</DropdownMenuItem>
						<DropdownMenuSeparator className="bg-white/10" />
					</>
				) : null}
				<DropdownMenuItem
					className="voice-call-menu-item gap-2"
					onSelect={() => onToggleCaptions()}
				>
					<Captions className="h-4 w-4" aria-hidden />
					{captionsOn ? "Hide live captions" : "Show live captions"}
				</DropdownMenuItem>
				<DropdownMenuItem
					className="voice-call-menu-item gap-2"
					onSelect={() => onToggleVoiceAnon()}
				>
					<ShieldHalf className="h-4 w-4" aria-hidden />
					{voiceAnonOn ? "Turn off voice anonymization" : "Anonymize my voice"}
				</DropdownMenuItem>
				<DropdownMenuItem
					className="voice-call-menu-item gap-2"
					onSelect={() => onDownloadTranscript()}
				>
					<Download className="h-4 w-4" aria-hidden />
					Download transcript
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
