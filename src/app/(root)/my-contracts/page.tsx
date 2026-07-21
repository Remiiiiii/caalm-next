"use client";

import { ArrowLeft, Building2, FileText, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import FileCard from "@/components/Card";
import SearchInput from "@/components/SearchInput";
import Sort from "@/components/Sort";
import { Button } from "@/components/ui/button";
import {
	CardContent,
	CardHeader,
	CardTitle,
	Card as UICard,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import {
	getContractsByUserDivision,
	getFiles,
} from "@/lib/actions/file.actions";
import { convertFileSize } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";
import {
	type ContractDepartment,
	DIVISION_TO_DEPARTMENT,
} from "../../../../constants";

const MyContractsPage = () => {
	const { division, loading, error } = useUserRole();
	const { permissions } = usePermissions();
	const [contracts, setContracts] = useState<UIFileDoc[]>([]);
	const [filteredContracts, setFilteredContracts] = useState<UIFileDoc[]>([]);
	const [selectedDepartment, setSelectedDepartment] =
		useState<ContractDepartment>("Operations");
	const [selectedDivision, setSelectedDivision] = useState<string>("");
	const [sortBy] = useState<string>("$createdAt-desc");

	const contractsList = filteredContracts ?? [];

	// Function to refresh contracts data
	const refreshContracts = async () => {
		try {
			// Department Manager - get contracts filtered by their division
			if (
				permissions.includes(PERMISSIONS.CONTRACTS.VIEW) &&
				!permissions.includes(PERMISSIONS.SETTINGS.VIEW) &&
				division
			) {
				const divisionContracts =
					(await getContractsByUserDivision(division)) || [];

				// Get the corresponding file documents for these contracts
				const contractFiles: UIFileDoc[] = [];
				for (const contract of divisionContracts) {
					if (contract.fileId) {
						try {
							const fileResponse = await getFiles({
								types: ["document"],
								searchText: "",
								sort: sortBy,
							});
							const documents = fileResponse?.documents || [];
							const file = documents.find(
								(f: UIFileDoc) => f.$id === contract.fileId,
							);
							if (file) {
								contractFiles.push(file as UIFileDoc);
							}
						} catch (error) {
							console.error("Error fetching file for contract:", error);
						}
					}
				}

				setContracts(contractFiles);
				setFilteredContracts(contractFiles);
			} else if (permissions.includes(PERMISSIONS.CONTRACTS.VIEW)) {
				// Super Admin/Organization Admin - get all contracts
				const filesResponse = await getFiles({
					types: ["document"],
					searchText: "",
					sort: sortBy,
				});

				const contractFiles = (filesResponse?.documents || []) as UIFileDoc[];
				setContracts(contractFiles);
				setFilteredContracts(contractFiles);
			} else {
				setContracts([]);
				setFilteredContracts([]);
			}
		} catch (err) {
			console.error("Error refreshing contracts:", err);
			setContracts([]);
			setFilteredContracts([]);
		}
	};

	// Fetch contracts on component mount
	useEffect(() => {
		if (permissions.length > 0 && !loading) {
			void refreshContracts();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when role/permissions settle
	}, [permissions, loading, division]);

	// Filter contracts based on permissions and selected department/division
	useEffect(() => {
		if (!contracts.length) {
			setFilteredContracts([]);
			return;
		}

		let filtered = [...contracts];

		// Department Manager - contracts already filtered by division
		if (
			permissions.includes(PERMISSIONS.CONTRACTS.VIEW) &&
			!permissions.includes(PERMISSIONS.SETTINGS.VIEW) &&
			division
		) {
			filtered = contracts;
		} else if (permissions.includes(PERMISSIONS.SETTINGS.VIEW)) {
			// Super Admin/Organization Admin - filter by selected department
			filtered = contracts.filter(
				(contract) => contract.department === selectedDepartment,
			);
		}

		setFilteredContracts(filtered);
	}, [contracts, permissions, division, selectedDepartment]);

	// Get accessible departments for the user
	const getAccessibleDepartments = (): ContractDepartment[] => {
		// Super Admin/Organization Admin can see all departments
		if (permissions.includes(PERMISSIONS.SETTINGS.VIEW)) {
			return [
				"IT",
				"Finance",
				"Administration",
				"Legal",
				"Operations",
				"Sales",
				"Marketing",
				"Executive",
				"Engineering",
			];
		} else if (permissions.includes(PERMISSIONS.CONTRACTS.VIEW) && division) {
			// Department Manager - only their department
			const userDepartment =
				DIVISION_TO_DEPARTMENT[division as keyof typeof DIVISION_TO_DEPARTMENT];
			return userDepartment ? [userDepartment as ContractDepartment] : [];
		}
		return [];
	};

	// Get divisions for a specific department
	const getDivisionsForDepartment = (
		department: ContractDepartment,
	): string[] => {
		if (department === "Operations") {
			return [
				"child-welfare",
				"behavioral-health",
				"clinic",
				"residential",
				"cfs",
			];
		} else if (department === "IT") {
			return ["support", "help-desk"];
		} else if (department === "Executive") {
			return ["c-suite"];
		}
		return [];
	};

	// Calculate total file size
	const totalSizeBytes = contractsList.reduce(
		(sum, file) => sum + (file.size || 0),
		0,
	);
	const totalSizeFormatted = convertFileSize({ sizeInBytes: totalSizeBytes });

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-center py-2">
					<LoadingSpinner
						size="sm"
						label="Loading contracts..."
						className="!p-0"
					/>
				</div>
				<div className="animate-pulse">
					<div className="h-8 bg-white/20 rounded-xl w-1/3 mb-4"></div>
					<div className="h-4 bg-white/20 rounded-xl w-1/2 mb-6"></div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="h-32 bg-white/20 rounded-xl backdrop-blur"
							></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<UICard className="bg-red-50/60 backdrop-blur border border-red-200/40 shadow-lg">
					<CardHeader>
						<CardTitle className="h2 text-red-700">
							Error Loading Contracts
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="body-1 text-red-600">{error}</p>
					</CardContent>
				</UICard>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="relative flex items-center justify-between">
				<Link href="/dashboard">
					<Button
						variant="outline"
						size="sm"
						className="bg-white/60 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
				</Link>
				<h1 className="absolute left-1/2 -translate-x-1/2 h1 sidebar-gradient-text text-center w-full pointer-events-none">
					My Contracts
				</h1>
			</div>

			{/* Permission-based content rendering */}
			{permissions.includes(PERMISSIONS.SETTINGS.VIEW) ? (
				<div className="space-y-6">
					{/* Executive/Admin Layout with Tabs */}
					<UICard className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
						<CardHeader>
							<CardTitle className="h2 sidebar-gradient-text flex items-center gap-2">
								<Building2 className="h-6 w-6" />
								Department Contracts
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Tabs
								defaultValue={selectedDepartment}
								className="w-full"
								onValueChange={(value) =>
									setSelectedDepartment(value as ContractDepartment)
								}
							>
								<TabsList className="flex w-full bg-white/20 backdrop-blur border border-white/40 mb-6">
									{getAccessibleDepartments().map((dept) => (
										<TabsTrigger
											key={dept}
											value={dept}
											className="flex-1 data-[state=active]:bg-white/30 data-[state=active]:text-navy tabs-underline"
										>
											{dept}
										</TabsTrigger>
									))}
								</TabsList>

								{getAccessibleDepartments().map((dept) => {
									const divisions = getDivisionsForDepartment(dept);
									return (
										<TabsContent key={dept} value={dept} className="space-y-4">
											{divisions.length > 0 && (
												<div className="mb-4">
													<h3 className="h3 text-slate-700 mb-3">Divisions</h3>
													<div className="flex gap-2 flex-wrap">
														<Button
															variant={
																selectedDivision === "" ? "default" : "outline"
															}
															size="sm"
															onClick={() => setSelectedDivision("")}
															className="bg-transparent backdrop-blur border border-white/40 tabs-underline hover:bg-transparent focus:bg-transparent text-slate-700 hover:text-slate-700 focus:text-slate-700 active:text-slate-700"
														>
															All {dept}
														</Button>
														{divisions.map((div) => (
															<Button
																key={div}
																variant={
																	selectedDivision === div
																		? "default"
																		: "outline"
																}
																size="sm"
																onClick={() => setSelectedDivision(div)}
																className="bg-transparent backdrop-blur border border-white/40 tabs-underline hover:bg-transparent focus:bg-transparent text-slate-700 hover:text-slate-700 focus:text-slate-700 active:text-slate-700"
															>
																{div
																	.split("-")
																	.map(
																		(word) =>
																			word.charAt(0).toUpperCase() +
																			word.slice(1),
																	)
																	.join(" ")}
															</Button>
														))}
													</div>
												</div>
											)}

											{/* Contracts Display */}
											<div className="space-y-4">
												<div className="flex justify-between items-center">
													<p className="body-1">
														Total:{" "}
														<span className="h5">{totalSizeFormatted}</span>
														<span className="ml-2 text-slate-600">
															({contractsList.length} contracts)
														</span>
													</p>
													<div className="flex items-center gap-4 text-slate-700">
														<SearchInput />
														<Sort />
													</div>
												</div>

												{contractsList.length > 0 ? (
													<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
														{contractsList.map((contract) => (
															<FileCard
																key={contract.$id}
																file={contract}
																status={contract.status}
																expirationDate={contract.contractExpiryDate}
																onRefresh={refreshContracts}
															/>
														))}
													</div>
												) : (
													<div className="text-center py-12">
														<FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
														<p className="body-1 text-slate-600">
															No contracts found for {dept}
														</p>
													</div>
												)}
											</div>
										</TabsContent>
									);
								})}
							</Tabs>
						</CardContent>
					</UICard>
				</div>
			) : permissions.includes(PERMISSIONS.CONTRACTS.VIEW) &&
				!permissions.includes(PERMISSIONS.SETTINGS.VIEW) ? (
				<div className="space-y-6">
					{/* Manager Layout - Direct Display */}
					<UICard className="bg-blue-50/60 backdrop-blur border border-blue-200/40 shadow-lg">
						<CardHeader>
							<CardTitle className="h2 text-blue-700 flex items-center gap-2">
								<Users className="h-6 w-6" />
								My Division Contracts
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="body-1 text-blue-600 mb-4">
								You can view contracts assigned to your division:{" "}
								{division
									? division
											.split("-")
											.map(
												(word) => word.charAt(0).toUpperCase() + word.slice(1),
											)
											.join(" ")
									: "N/A"}
							</p>

							{/* Contracts Display */}
							<div className="space-y-4">
								<div className="flex justify-between items-center">
									<p className="body-1">
										Total: <span className="h5">{totalSizeFormatted}</span>
										<span className="ml-2 text-slate-600">
											({contractsList.length} contracts)
										</span>
									</p>
									<div className="flex items-center gap-4">
										<SearchInput />
										<Sort />
									</div>
								</div>

								{contractsList.length > 0 ? (
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										{contractsList.map((contract) => (
											<FileCard
												key={contract.$id}
												file={contract}
												status={contract.status}
												expirationDate={contract.contractExpiryDate}
												onRefresh={refreshContracts}
											/>
										))}
									</div>
								) : (
									<div className="text-center py-12">
										<FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
										<p className="body-1 text-slate-600">
											No contracts found for your division
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</UICard>
				</div>
			) : (
				<div className="space-y-6">
					{/* Access Denied */}
					<UICard className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
						<CardHeader>
							<CardTitle className="h2 text-slate-700">Access Denied</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="body-1 text-slate-600">
								You don&apos;t have permission to view contracts.
							</p>
						</CardContent>
					</UICard>
				</div>
			)}
		</div>
	);
};

export default MyContractsPage;
