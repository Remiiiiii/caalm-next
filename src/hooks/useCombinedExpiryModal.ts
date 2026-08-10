"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	buildExpiryQueue,
	calculateDaysUntilExpiry,
	type ExpiryQueueItem,
	type ExpiryShownState,
	loadExpiryShownState,
	mergeShownWithItems,
	saveExpiryShownState,
} from "@/lib/expiry/expiry-queue";
import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";

/**
 * Combined contracts + licenses expiring in 0–30 days for the full-screen carousel.
 */
export function useCombinedExpiryModal(contracts: UIFileDoc[]) {
	const [shown, setShown] = useState<ExpiryShownState>({
		contracts: [],
		licenses: [],
	});
	const [licenses, setLicenses] = useState<License[]>([]);
	const [licensesFetchSettled, setLicensesFetchSettled] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [testMode, setTestMode] = useState(false);
	const [testItems, setTestItems] = useState<ExpiryQueueItem[]>([]);
	const [wasManuallyClosed, setWasManuallyClosed] = useState(false);

	useEffect(() => {
		setShown(loadExpiryShownState());
	}, []);

	const fetchExpiringLicenses = useCallback(async () => {
		try {
			const res = await fetch("/api/licenses/expiring?days=30");
			if (!res.ok) return;
			const json = await res.json();
			const list: License[] =
				json?.data?.licenses ?? json?.licenses ?? json?.data ?? [];
			setLicenses(Array.isArray(list) ? list : []);
		} catch (error) {
			console.error("[useCombinedExpiryModal] Failed to load licenses:", error);
		} finally {
			setLicensesFetchSettled(true);
		}
	}, []);

	useEffect(() => {
		void fetchExpiringLicenses();
	}, [fetchExpiringLicenses]);

	const itemsToShow = useMemo(() => {
		if (testMode && testItems.length > 0) {
			return testItems;
		}
		return buildExpiryQueue({
			contracts: Array.isArray(contracts) ? contracts : [],
			licenses,
			shown,
		});
	}, [contracts, licenses, shown, testMode, testItems]);

	const shouldPlaySpeech = useMemo(() => {
		if (itemsToShow.length === 0) return false;
		const days = itemsToShow[0]?.days;
		return days !== null && days !== undefined;
	}, [itemsToShow]);

	useEffect(() => {
		if (
			licensesFetchSettled &&
			itemsToShow.length > 0 &&
			!isModalOpen &&
			!testMode &&
			!wasManuallyClosed
		) {
			setIsModalOpen(true);
		}
	}, [
		licensesFetchSettled,
		itemsToShow.length,
		isModalOpen,
		testMode,
		wasManuallyClosed,
	]);

	const triggerTestModal = async () => {
		try {
			setWasManuallyClosed(false);

			const [contractsRes, licensesRes] = await Promise.all([
				fetch("/api/contracts/all"),
				fetch("/api/licenses/expiring?days=90"),
			]);

			const contractList: UIFileDoc[] = contractsRes.ok
				? ((await contractsRes.json()).data ?? [])
				: [];
			const licenseJson = licensesRes.ok ? await licensesRes.json() : null;
			const licenseList: License[] =
				licenseJson?.data?.licenses ?? licenseJson?.licenses ?? [];

			let queue = buildExpiryQueue({
				contracts: contractList,
				licenses: Array.isArray(licenseList) ? licenseList : [],
				bypassWindow: true,
			}).filter((item) => item.days >= 30 && item.days <= 60);

			if (queue.length === 0) {
				queue = buildExpiryQueue({
					contracts: contractList,
					licenses: Array.isArray(licenseList) ? licenseList : [],
					bypassWindow: true,
				}).filter((item) => item.days >= 0 && item.days <= 90);
			}

			queue = queue.slice(0, 4);
			if (queue.length === 0) {
				console.warn("No contracts/licenses found for test expiry modal");
				return;
			}

			setTestItems(queue);
			setTestMode(true);
			setIsModalOpen(true);
		} catch (error) {
			console.error("Failed to fetch items for test modal:", error);
		}
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setWasManuallyClosed(true);

		if (typeof window !== "undefined" && !testMode && itemsToShow.length > 0) {
			const next = mergeShownWithItems(shown, itemsToShow);
			saveExpiryShownState(next);
			setShown(next);
		}

		if (testMode) {
			setTestMode(false);
			setTestItems([]);
		}
	};

	const markItemDismissed = useCallback(
		(item: ExpiryQueueItem) => {
			if (testMode) {
				setTestItems((prev) =>
					prev.filter(
						(i) => !(i.kind === item.kind && i.id === item.id),
					),
				);
				return;
			}
			const next = mergeShownWithItems(shown, [item]);
			saveExpiryShownState(next);
			setShown(next);
		},
		[shown, testMode],
	);

	const openForContractId = useCallback(
		(contractId: string) => {
			const filesArray = Array.isArray(contracts) ? contracts : [];
			const match = filesArray.find((f) => f.$id === contractId);
			if (!match) {
				console.warn(
					`[useCombinedExpiryModal] No contract found for id ${contractId}`,
				);
				return false;
			}
			const days = calculateDaysUntilExpiry(match.contractExpiryDate) ?? 0;
			setWasManuallyClosed(false);
			setTestItems([
				{ kind: "contract", id: match.$id, file: match, days },
			]);
			setTestMode(true);
			setIsModalOpen(true);
			return true;
		},
		[contracts],
	);

	const openForLicenseId = useCallback(
		(licenseId: string) => {
			const match = licenses.find((l) => l.$id === licenseId);
			if (!match) {
				// Try fetch once more for deep-link race
				void (async () => {
					try {
						const res = await fetch("/api/licenses/expiring?days=90");
						if (!res.ok) return;
						const json = await res.json();
						const list: License[] =
							json?.data?.licenses ?? json?.licenses ?? [];
						const found = list.find((l) => l.$id === licenseId);
						if (!found) {
							console.warn(
								`[useCombinedExpiryModal] No license found for id ${licenseId}`,
							);
							return;
						}
						const days =
							calculateDaysUntilExpiry(
								found.licenseExpiryDate || found.expirationDate,
							) ?? 0;
						setWasManuallyClosed(false);
						setLicenses(list);
						setTestItems([
							{ kind: "license", id: found.$id, license: found, days },
						]);
						setTestMode(true);
						setIsModalOpen(true);
					} catch {
						// ignore
					}
				})();
				return false;
			}
			const days =
				calculateDaysUntilExpiry(
					match.licenseExpiryDate || match.expirationDate,
				) ?? 0;
			setWasManuallyClosed(false);
			setTestItems([
				{ kind: "license", id: match.$id, license: match, days },
			]);
			setTestMode(true);
			setIsModalOpen(true);
			return true;
		},
		[licenses],
	);

	const openForEntityId = useCallback(
		(entity: "contract" | "license", id: string) => {
			if (entity === "contract") return openForContractId(id);
			return openForLicenseId(id);
		},
		[openForContractId, openForLicenseId],
	);

	const refreshLicenses = fetchExpiringLicenses;

	return {
		itemsToShow,
		/** @deprecated Prefer itemsToShow — contract files only for legacy callers */
		contractsToShow: itemsToShow
			.filter((i): i is Extract<ExpiryQueueItem, { kind: "contract" }> =>
				i.kind === "contract",
			)
			.map((i) => i.file),
		contractsWithDays: itemsToShow
			.filter((i): i is Extract<ExpiryQueueItem, { kind: "contract" }> =>
				i.kind === "contract",
			)
			.map((i) => ({ file: i.file, days: i.days })),
		isModalOpen,
		closeModal,
		triggerTestModal,
		openForContractId,
		openForLicenseId,
		openForEntityId,
		markItemDismissed,
		refreshLicenses,
		shouldPlaySpeech,
	};
}

/** @deprecated Use useCombinedExpiryModal */
export function useContractExpiryModal(files: UIFileDoc[]) {
	return useCombinedExpiryModal(files);
}
