import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExpiryCarousel from "@/components/contract-expiry-modal/ExpiryCarousel";
import type { ExpiryQueueItem } from "@/lib/expiry/expiry-queue";
import type { UIFileDoc } from "@/types/files";

const suppressContractAlarm = vi.fn();
const generateSpeech = vi.fn().mockResolvedValue(undefined);
const stop = vi.fn();

vi.mock("@/lib/sounds/contractAlarm", () => ({
	suppressContractAlarm: (...args: unknown[]) => suppressContractAlarm(...args),
}));

vi.mock("@/hooks/useElevenLabsTTS", () => ({
	useElevenLabsTTS: () => ({
		generateSpeech,
		play: vi.fn(),
		pause: vi.fn(),
		stop,
		isPlaying: true,
		isLoading: false,
		error: null,
	}),
}));

vi.mock("@/contexts/AuthContext", () => ({
	useAuth: () => ({ user: { name: "Alex" } }),
}));

vi.mock("@/components/expiry-alert-modal/ExpiryQueueAlertBridge", () => ({
	default: ({
		onItemHandled,
		item,
	}: {
		onItemHandled: (item: ExpiryQueueItem) => void;
		item: ExpiryQueueItem;
	}) => (
		<button type="button" onClick={() => onItemHandled(item)}>
			Let Expire
		</button>
	),
}));

function makeItem(id: string, name: string): ExpiryQueueItem {
	return {
		kind: "contract",
		id,
		days: 4,
		file: {
			$id: id,
			contractName: name,
			contractExpiryDate: "2026-09-01",
			status: "active",
			name,
		} as UIFileDoc,
	};
}

describe("ExpiryCarousel alarm + mute", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		generateSpeech.mockResolvedValue(undefined);
	});

	it("suppresses the looping dashboard bell when the overlay mounts", () => {
		render(
			<ExpiryCarousel
				items={[
					makeItem("c1", "First Contract"),
					makeItem("c2", "Second Contract"),
				]}
				onDismiss={vi.fn()}
				onItemDismissed={vi.fn()}
			/>,
		);

		expect(suppressContractAlarm).toHaveBeenCalled();
	});

	it("lets the user mute without waiting for TTS to finish loading", async () => {
		const user = userEvent.setup();
		render(
			<ExpiryCarousel
				items={[
					makeItem("c1", "First Contract"),
					makeItem("c2", "Second Contract"),
				]}
				onDismiss={vi.fn()}
				onItemDismissed={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Mute audio" }));
		expect(stop).toHaveBeenCalled();
		expect(suppressContractAlarm).toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Unmute audio" })).toBeInTheDocument();
	});

	it("suppresses the bell again when Let Expire advances the queue", async () => {
		const user = userEvent.setup();
		const onItemDismissed = vi.fn();
		render(
			<ExpiryCarousel
				items={[
					makeItem("c1", "First Contract"),
					makeItem("c2", "Second Contract"),
				]}
				onDismiss={vi.fn()}
				onItemDismissed={onItemDismissed}
			/>,
		);

		suppressContractAlarm.mockClear();
		await user.click(screen.getByRole("button", { name: "Let Expire" }));
		expect(onItemDismissed).toHaveBeenCalled();
		expect(suppressContractAlarm).toHaveBeenCalled();
		expect(stop).toHaveBeenCalled();
	});
});
