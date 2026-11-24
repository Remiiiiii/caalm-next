import { MessageSquareText, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { MoreMenu } from "@/components/audit-lab/voice/MoreMenu";
import { ParticipantsPopover } from "@/components/audit-lab/voice/ParticipantsPopover";
import { SessionDetailsPopover } from "@/components/audit-lab/voice/SessionDetailsPopover";
import type { ReviewSessionParticipantRow } from "@/lib/audit-lab/types";
import { cn } from "@/lib/utils";

export function ControlBar({
	participants,
	micOn,
	onToggleMic,
	camOn,
	onToggleCam,
	showTranscript,
	onToggleTranscript,
	sessionTitle,
	sessionDepartment,
	sessionFramework,
	personaLabel,
	isFacilitator,
	isPaused,
	onTogglePause,
	captionsOn,
	onToggleCaptions,
	voiceAnonOn,
	onToggleVoiceAnon,
	onDownloadTranscript,
}: {
	participants: ReviewSessionParticipantRow[];
	micOn: boolean;
	onToggleMic: () => void;
	camOn: boolean;
	onToggleCam: () => void;
	showTranscript: boolean;
	onToggleTranscript: () => void;
	sessionTitle: string;
	sessionDepartment?: string;
	sessionFramework?: string;
	personaLabel: string;
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
		<div className="voice-call-control-bar">
			<button
				type="button"
				onClick={onToggleMic}
				aria-pressed={micOn}
				aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
				className={cn(
					"voice-call-control-btn",
					!micOn && "voice-call-control-btn-danger",
				)}
			>
				{micOn ? (
					<Mic className="h-3.5 w-3.5" aria-hidden />
				) : (
					<MicOff className="h-3.5 w-3.5" aria-hidden />
				)}
			</button>
			<button
				type="button"
				onClick={onToggleCam}
				aria-pressed={camOn}
				aria-label={camOn ? "Turn off camera" : "Turn on camera"}
				className={cn(
					"voice-call-control-btn",
					!camOn && "voice-call-control-btn-danger",
				)}
			>
				{camOn ? (
					<Video className="h-3.5 w-3.5" aria-hidden />
				) : (
					<VideoOff className="h-3.5 w-3.5" aria-hidden />
				)}
			</button>
			<span className="voice-call-control-divider" aria-hidden />
			<ParticipantsPopover participants={participants} />
			<button
				type="button"
				onClick={onToggleTranscript}
				aria-pressed={showTranscript}
				aria-label={showTranscript ? "Hide transcript" : "Show transcript"}
				className={cn(
					"voice-call-control-btn",
					showTranscript && "voice-call-control-btn-active",
				)}
			>
				<MessageSquareText className="h-3.5 w-3.5" aria-hidden />
			</button>
			<span className="voice-call-control-divider" aria-hidden />
			<SessionDetailsPopover
				title={sessionTitle}
				department={sessionDepartment}
				framework={sessionFramework}
				personaLabel={personaLabel}
			/>
			<MoreMenu
				isFacilitator={isFacilitator}
				isPaused={isPaused}
				onTogglePause={onTogglePause}
				captionsOn={captionsOn}
				onToggleCaptions={onToggleCaptions}
				voiceAnonOn={voiceAnonOn}
				onToggleVoiceAnon={onToggleVoiceAnon}
				onDownloadTranscript={onDownloadTranscript}
			/>
		</div>
	);
}
