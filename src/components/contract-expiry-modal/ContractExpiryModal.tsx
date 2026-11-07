"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ExpiryQueueItem } from "@/lib/expiry/expiry-queue";
import type { UIFileDoc } from "@/types/files";
import ExpiryCarousel from "./ExpiryCarousel";

interface ContractExpiryModalProps {
	/** Preferred: combined contract + license queue */
	items?: ExpiryQueueItem[];
	/** Legacy: contracts-only list */
	contracts?: UIFileDoc[];
	contractsWithDays?: Array<{ file: UIFileDoc; days: number | null }>;
	isOpen: boolean;
	onClose: () => void;
	onStatusChange?: () => void;
	onItemDismissed?: (item: ExpiryQueueItem) => void;
	/** Park without dismissing — Open in Contracts/Licenses. */
	onParkSession?: (index: number) => void;
	shouldPlaySpeech?: boolean;
	initialIndex?: number;
}

function contractsToItems(contracts: UIFileDoc[]): ExpiryQueueItem[] {
	return contracts.map((file) => {
		let days = 0;
		if (file.contractExpiryDate) {
			try {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const expiryStr = file.contractExpiryDate.split("T")[0];
				const [year, month, day] = expiryStr.split("-").map(Number);
				const expiry = new Date(year, month - 1, day);
				expiry.setHours(0, 0, 0, 0);
				days = Math.ceil(
					(expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
				);
			} catch {
				days = 0;
			}
		}
		return { kind: "contract" as const, id: file.$id, file, days };
	});
}

/**
 * Shell for one or more contract/license expiry alerts.
 * X / dismiss = suppress for this browser session only.
 */
export default function ContractExpiryModal({
	items: itemsProp,
	contracts,
	isOpen,
	onClose,
	onStatusChange,
	onItemDismissed,
	onParkSession,
	shouldPlaySpeech = true,
	initialIndex = 0,
}: ContractExpiryModalProps) {
	const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(
		() => new Set(),
	);
	const previousActiveElement = useRef<HTMLElement | null>(null);

	const baseItems =
		itemsProp ??
		(contracts ? contractsToItems(contracts) : ([] as ExpiryQueueItem[]));

	const activeItems = baseItems.filter(
		(item) => !dismissedKeys.has(`${item.kind}:${item.id}`),
	);

	const handleItemDismissed = (item: ExpiryQueueItem) => {
		setDismissedKeys((prev) => new Set(prev).add(`${item.kind}:${item.id}`));
		onItemDismissed?.(item);
		onStatusChange?.();

		const remaining = baseItems.filter(
			(i) =>
				!(i.kind === item.kind && i.id === item.id) &&
				!dismissedKeys.has(`${i.kind}:${i.id}`),
		);
		if (remaining.length === 0) {
			onClose();
		}
	};

	useEffect(() => {
		if (!isOpen) {
			setDismissedKeys(new Set());
			return;
		}
		previousActiveElement.current = document.activeElement as HTMLElement;
		return () => {
			previousActiveElement.current?.focus();
		};
	}, [isOpen]);

	// Desktop-first, but the alert is a companion interrupt (approve / renew /
	// snooze / glance), so it may open on phones too.
	if (!isOpen || activeItems.length === 0) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-9999"
				>
					<ExpiryCarousel
						items={activeItems}
						onDismiss={onClose}
						onItemDismissed={handleItemDismissed}
						onParkSession={onParkSession}
						onStatusChange={onStatusChange}
						shouldPlaySpeech={shouldPlaySpeech}
						initialIndex={initialIndex}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
