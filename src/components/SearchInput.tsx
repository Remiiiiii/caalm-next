"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { SearchField } from "@/components/ui/search-field";
import SearchModal from "./SearchModal";

const SearchInput: React.FC = () => {
	const [isModalOpen, setIsModalOpen] = useState(false);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				setIsModalOpen(true);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<>
			<div className="relative shrink-0">
				<SearchField
					placeholder="Search contracts..."
					onClick={() => setIsModalOpen(true)}
					readOnly
					containerClassName="w-96 min-w-80 max-w-full shrink-0"
					className="cursor-pointer pr-16!"
				/>
				<div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
					<span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
						Ctrl+K
					</span>
				</div>
			</div>

			<SearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
		</>
	);
};

export default SearchInput;
