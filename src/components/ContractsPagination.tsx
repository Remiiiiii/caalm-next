"use client";

import { useEffect } from "react";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface ContractsPaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export default function ContractsPagination({
	currentPage,
	totalPages,
	onPageChange,
}: ContractsPaginationProps) {
	// Scroll to top when page changes
	useEffect(() => {
		if (currentPage > 1) {
			// Smooth scroll to top of page
			window.scrollTo({
				top: 0,
				behavior: "smooth",
			});
		}
	}, [currentPage]);

	// Generate page numbers to display
	const getPageNumbers = () => {
		const pages: (number | "ellipsis")[] = [];
		const maxVisible = 5;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			if (currentPage <= 3) {
				for (let i = 1; i <= 4; i++) {
					pages.push(i);
				}
				pages.push("ellipsis");
				pages.push(totalPages);
			} else if (currentPage >= totalPages - 2) {
				pages.push(1);
				pages.push("ellipsis");
				for (let i = totalPages - 3; i <= totalPages; i++) {
					pages.push(i);
				}
			} else {
				pages.push(1);
				pages.push("ellipsis");
				for (let i = currentPage - 1; i <= currentPage + 1; i++) {
					pages.push(i);
				}
				pages.push("ellipsis");
				pages.push(totalPages);
			}
		}

		return pages;
	};

	if (totalPages <= 1) {
		return null;
	}

	return (
		<div className="mt-6 flex justify-center">
			<Pagination aria-label="Contracts pagination">
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious
							href="#"
							onClick={(e) => {
								e.preventDefault();
								if (currentPage > 1) {
									onPageChange(currentPage - 1);
								}
							}}
							className={
								currentPage === 1
									? "pointer-events-none opacity-50"
									: "cursor-pointer"
							}
							aria-disabled={currentPage === 1}
							tabIndex={currentPage === 1 ? -1 : 0}
						/>
					</PaginationItem>
					{getPageNumbers().map((page, index) => (
						<PaginationItem key={index}>
							{page === "ellipsis" ? (
								<PaginationEllipsis aria-label="More pages" />
							) : (
								<PaginationLink
									href="#"
									onClick={(e) => {
										e.preventDefault();
										if (typeof page === "number") {
											onPageChange(page);
										}
									}}
									isActive={currentPage === page}
									className="cursor-pointer"
									aria-label={`Go to page ${page}`}
									aria-current={currentPage === page ? "page" : undefined}
								>
									{page}
								</PaginationLink>
							)}
						</PaginationItem>
					))}
					<PaginationItem>
						<PaginationNext
							href="#"
							onClick={(e) => {
								e.preventDefault();
								if (currentPage < totalPages) {
									onPageChange(currentPage + 1);
								}
							}}
							className={
								currentPage === totalPages
									? "pointer-events-none opacity-50"
									: "cursor-pointer"
							}
							aria-disabled={currentPage === totalPages}
							tabIndex={currentPage === totalPages ? -1 : 0}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	);
}
