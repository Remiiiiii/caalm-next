"use client";

import {
	Bell,
	FileCheck,
	GraduationCap,
	Upload,
	UserPlus,
	Users,
} from "lucide-react";
import type { Models } from "node-appwrite";
import ContractExpiryAlertsWidget from "@/components/ContractExpiryAlertsWidget";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import RecentActivity from "@/components/RecentActivity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";

interface HRDashboardProps {
	user?:
		| (Models.User<Models.Preferences> & {
				$id: string;
				accountId?: string;
				fullName?: string;
				name?: string;
				role?: string;
				division?: string;
				department?: string;
				departmentLabel?: string;
		  })
		| null;
}

const HRDashboard = ({ user }: HRDashboardProps) => {
	const trainingStats = [
		{
			title: "Active Employees",
			value: "187",
			icon: Users,
			color: "text-blue",
		},
		{
			title: "Training Completed",
			value: "94%",
			icon: GraduationCap,
			color: "text-green",
		},
		{
			title: "Certifications Due",
			value: "23",
			icon: FileCheck,
			color: "text-orange",
		},
		{
			title: "Compliance Alerts",
			value: "5",
			icon: Bell,
			color: "text-coral",
		},
	];

	const employeeTraining = [
		{
			id: 1,
			employee: "John Smith",
			department: "IT",
			certification: "Security Clearance",
			status: "expired",
			dueDate: "2024-06-15",
			contractRequirement: "Federal IT Services Contract",
		},
		{
			id: 2,
			employee: "Mary Johnson",
			department: "Operations",
			certification: "Safety Training",
			status: "due-soon",
			dueDate: "2024-08-10",
			contractRequirement: "Municipal Services Contract",
		},
		{
			id: 3,
			employee: "Robert Davis",
			department: "Finance",
			certification: "Financial Compliance",
			status: "current",
			dueDate: "2025-01-15",
			contractRequirement: "State Audit Requirements",
		},
		{
			id: 4,
			employee: "John Doe",
			department: "Administration",
			certification: "HR Compliance",
			status: "current",
			dueDate: "2025-09-15",
			contractRequirement: "Staff Training Audit Requirements",
		},
		{
			id: 5,
			employee: "Jane Doe",
			department: "Legal",
			certification: "Legal Compliance",
			status: "current",
			dueDate: "2025-12-15",
			contractRequirement: "State Legal Requirements",
		},
		{
			id: 6,
			employee: "Rhiannon Smith",
			department: "Sales",
			certification: "Sales Training",
			status: "due-soon",
			dueDate: "2025-09-05",
			contractRequirement: "Sales Training Requirements",
		},
		{
			id: 7,
			employee: "Gabriel Torres",
			department: "Marketing",
			certification: "Marketing Training",
			status: "current",
			dueDate: "2026-09-15",
			contractRequirement: "Marketing Training Requirements",
		},
		{
			id: 8,
			employee: "Hannah Cumberbatch",
			department: "Engineering",
			certification: "Engineering Training",
			status: "current",
			dueDate: "2026-01-17",
			contractRequirement: "Engineering Training Requirements",
		},
	];

	const pendingDocuments = [
		{
			id: 1,
			type: "Training Certificate",
			employee: "Alice Wilson",
			uploaded: "2 hours ago",
		},
		{
			id: 2,
			type: "Background Check",
			employee: "David Brown",
			uploaded: "1 day ago",
		},
		{
			id: 3,
			type: "License Renewal",
			employee: "Sarah Miller",
			uploaded: "3 days ago",
		},
	];

	const getStatusColor = (status: string) => {
		switch (status) {
			case "current":
				return "text-green bg-accent-green";
			case "due-soon":
				return "text-orange bg-accent-orange";
			case "expired":
				return "text-coral bg-coral/10";
			default:
				return "text-slate-dark bg-background";
		}
	};

	return (
		<div className="space-y-6">
			<DashboardGreeting
				user={user}
				actions={
					<>
						<Button variant="default" className="primary-btn px-3 sm:px-4">
							<UserPlus className="h-4 w-4" />
							Add Employee
						</Button>
						<Button className="primary-btn px-3 sm:px-4">
							<Upload className="h-4 w-4" />
							Upload Training Record
						</Button>
					</>
				}
			/>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{trainingStats.map((stat) => (
					<Card key={stat.title} className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text">
										{stat.title}
									</p>
									<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
										<span>{stat.value}</span>
										<StatCardIcon className="ml-2" icon={stat.icon} />
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Employee Training Status */}
				<div className="lg:col-span-2">
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardHeader>
							<CardTitle className="text-lg font-bold sidebar-gradient-text">
								Employee Training Status
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{employeeTraining.map((training) => (
									<div
										key={training.id}
										className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
									>
										<div>
											<p className="font-medium text-slate-700">
												{training.employee}
											</p>
											<p className="text-sm text-slate-600">
												{training.department} · {training.certification}
											</p>
											<p className="text-xs text-slate-500 mt-1">
												{training.contractRequirement}
											</p>
										</div>
										<div className="text-right">
											<span
												className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(training.status)}`}
											>
												{training.status}
											</span>
											<p className="text-xs text-slate-500 mt-1">
												Due {training.dueDate}
											</p>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar widgets */}
				<div className="space-y-6">
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardHeader>
							<CardTitle className="text-lg font-bold sidebar-gradient-text">
								Pending Documents
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{pendingDocuments.map((doc) => (
									<div
										key={doc.id}
										className="flex justify-between items-start border-b border-slate-200 pb-2 last:border-0"
									>
										<div>
											<p className="text-sm font-medium text-slate-700">
												{doc.type}
											</p>
											<p className="text-xs text-slate-500">{doc.employee}</p>
										</div>
										<span className="text-xs text-slate-500">{doc.uploaded}</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
					<ContractExpiryAlertsWidget maxVisible={3} compact />
					<RecentActivity />
				</div>
			</div>
		</div>
	);
};

export default HRDashboard;
