"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UIFileDoc } from "@/types/files";

/**
 * Calculate days until expiry for a contract
 * Uses the same logic as ContractsMetricsBar.tsx
 */
function calculateDaysUntilExpiry(
	expiryDate: string | undefined,
): number | null {
	if (!expiryDate) return null;

	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Parse date-only strings (YYYY-MM-DD) using local timezone to avoid timezone issues
		const expiryStr = expiryDate.split("T")[0];
		const [year, month, day] = expiryStr.split("-").map(Number);
		const expiry = new Date(year, month - 1, day);
		expiry.setHours(0, 0, 0, 0);

		const diffTime = expiry.getTime() - today.getTime();
		const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		return days;
	} catch (error) {
		console.error("Error calculating days until expiry:", error);
		return null;
	}
}

/**
 * Hook to detect contracts expiring in the next 30 days
 * Tracks shown contracts in sessionStorage to prevent re-triggering
 */
export function useContractExpiryModal(files: UIFileDoc[]) {
	const [shownContractIds, setShownContractIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [testMode, setTestMode] = useState(false);
	const [testContracts, setTestContracts] = useState<UIFileDoc[]>([]);
	const [wasManuallyClosed, setWasManuallyClosed] = useState(false);

	// Load shown contract IDs from sessionStorage on mount
	useEffect(() => {
		if (typeof window === "undefined") return;

		try {
			const stored = sessionStorage.getItem("expiryModalShown");
			if (stored) {
				const ids = JSON.parse(stored) as string[];
				setShownContractIds(new Set(ids));
			}
		} catch (error) {
			console.error(
				"Error loading shown contract IDs from sessionStorage:",
				error,
			);
		}
	}, []);

	// Filter contracts that expire in the next 30 days (0-30 days) and haven't been shown
	const contractsToShow = useMemo(() => {
		// In test mode, return test contracts
		if (testMode && testContracts.length > 0) {
			return testContracts.map((file) => ({
				file,
				days: calculateDaysUntilExpiry(file.contractExpiryDate),
			}));
		}

		// Ensure files is always an array
		const filesArray = Array.isArray(files) ? files : [];

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return filesArray
			.map((file) => {
				const days = calculateDaysUntilExpiry(file.contractExpiryDate);
				// Check if contract is snoozed
				const snoozedUntil = (file as any).snoozedUntil;
				let isSnoozed = false;
				if (snoozedUntil) {
					try {
						const snoozeDate = new Date(snoozedUntil);
						snoozeDate.setHours(0, 0, 0, 0);
						isSnoozed = snoozeDate > today;
					} catch {
						// Invalid date, treat as not snoozed
					}
				}
				return { file, days, isSnoozed };
			})
			.filter(
				(item): item is { file: UIFileDoc; days: number; isSnoozed: boolean } =>
					item.days !== null &&
					item.days >= 0 &&
					item.days <= 30 &&
					!item.isSnoozed,
			)
			.filter((item) => !shownContractIds.has(item.file.$id))
			.map((item) => ({ file: item.file, days: item.days }));
	}, [files, shownContractIds, testMode, testContracts]);

	// Speak whenever the full-screen expiry modal has contracts to show
	// (including test mode / notification click-through at any day count).
	const shouldPlaySpeech = useMemo(() => {
		if (contractsToShow.length === 0) return false;
		const days = contractsToShow[0]?.days;
		return days !== null && days !== undefined;
	}, [contractsToShow]);

	// Auto-open modal when contracts are detected (but not if it was manually closed)
	useEffect(() => {
		if (
			contractsToShow.length > 0 &&
			!isModalOpen &&
			!testMode &&
			!wasManuallyClosed
		) {
			setIsModalOpen(true);
		}
	}, [contractsToShow.length, isModalOpen, testMode, wasManuallyClosed]);

	// Test function to trigger modal with real contracts from database
	const triggerTestModal = async () => {
		try {
			// Reset manual close flag when triggering test modal
			setWasManuallyClosed(false);

			// Fetch contracts directly from the API to ensure we have the latest data
			const response = await fetch("/api/contracts/all");
			if (!response.ok) {
				throw new Error("Failed to fetch contracts");
			}
			const result = await response.json();
			const fetchedContracts: UIFileDoc[] = result.data || [];

			// Use real contracts from the database
			// Filter to get contracts expiring in the next 30-60 days for testing
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const testContracts = fetchedContracts
				.filter((contract) => {
					if (!contract.contractExpiryDate) return false;
					const days = calculateDaysUntilExpiry(contract.contractExpiryDate);
					// Get contracts expiring in 30-60 days for testing
					return days !== null && days >= 30 && days <= 60;
				})
				.slice(0, 2); // Limit to 2 contracts for testing

			if (testContracts.length === 0) {
				// If no contracts in the 30-60 day range, use any contracts expiring in the next 90 days
				const fallbackContracts = fetchedContracts
					.filter((contract) => {
						if (!contract.contractExpiryDate) return false;
						const days = calculateDaysUntilExpiry(contract.contractExpiryDate);
						return days !== null && days >= 0 && days <= 90;
					})
					.slice(0, 2);

				if (fallbackContracts.length === 0) {
					console.warn("No contracts found in database for test modal");
					return;
				}

				setTestContracts(fallbackContracts);
			} else {
				setTestContracts(testContracts);
			}

			setTestMode(true);
			setIsModalOpen(true);
		} catch (error) {
			console.error("Failed to fetch contracts for test modal:", error);
		}
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setWasManuallyClosed(true); // Mark as manually closed to prevent auto-reopening

		// Mark contracts as shown in sessionStorage (only if not in test mode)
		if (
			typeof window !== "undefined" &&
			!testMode &&
			contractsToShow.length > 0
		) {
			try {
				const currentShown = Array.from(shownContractIds);
				const contractIds = contractsToShow.map((item) => item.file.$id);
				const newShown = [...currentShown, ...contractIds];
				const uniqueShown = Array.from(new Set(newShown));
				sessionStorage.setItem("expiryModalShown", JSON.stringify(uniqueShown));
				// Update state immediately to prevent contracts from showing again
				setShownContractIds(new Set(uniqueShown));
			} catch (error) {
				console.error(
					"Error saving shown contract IDs to sessionStorage:",
					error,
				);
			}
		}

		// Reset test mode when closing
		if (testMode) {
			setTestMode(false);
			setTestContracts([]);
		}
	};

	/** Open modal for a specific contract (e.g. desktop notification click-through). */
	const openForContractId = useCallback(
		(contractId: string) => {
			const filesArray = Array.isArray(files) ? files : [];
			const match = filesArray.find((f) => f.$id === contractId);
			if (!match) {
				console.warn(
					`[useContractExpiryModal] No contract found for id ${contractId}`,
				);
				return false;
			}
			setWasManuallyClosed(false);
			setTestContracts([match]);
			setTestMode(true);
			setIsModalOpen(true);
			return true;
		},
		[files],
	);

	return {
		contractsToShow: contractsToShow.map((item) => item.file),
		contractsWithDays: contractsToShow,
		isModalOpen,
		closeModal,
		triggerTestModal,
		openForContractId,
		shouldPlaySpeech,
	};
}
