"use client";

import { format } from "date-fns";
import {
	AlertCircle,
	Calendar,
	Info,
	Megaphone,
	Newspaper,
	User,
} from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface ArticlePreviewProps {
	title: string;
	content: string;
	type: "announcement" | "update" | "alert" | "info";
	priority: "high" | "medium" | "low";
	department?: string;
	author: string;
	date: string;
	image?: string;
}

const ArticlePreview: React.FC<ArticlePreviewProps> = ({
	title,
	content,
	type,
	priority,
	department,
	author,
	date,
	image,
}) => {
	const getTypeIcon = (type: string) => {
		switch (type) {
			case "announcement":
				return <Megaphone className="h-4 w-4 text-blue" />;
			case "alert":
				return <AlertCircle className="h-4 w-4 text-red" />;
			case "info":
				return <Info className="h-4 w-4 text-green" />;
			case "update":
				return <Newspaper className="h-4 w-4 text-pink" />;
			default:
				return <Newspaper className="h-4 w-4 text-slate-400" />;
		}
	};

	const getTypeColor = (type: string) => {
		switch (type) {
			case "announcement":
				return "bg-blue/10 text-blue border-blue/20";
			case "alert":
				return "bg-red/10 text-red border-red/20";
			case "info":
				return "bg-green/10 text-green border-green/20";
			case "update":
				return "bg-pink/10 text-pink border-pink/20";
			default:
				return "bg-light-300 text-light-100 border-light-200";
		}
	};

	const getPriorityBadge = (priority: string) => {
		switch (priority) {
			case "high":
				return (
					<Badge className="bg-red/10 text-red border-red/20 text-xs">
						High
					</Badge>
				);
			case "medium":
				return (
					<Badge className="bg-yellow/10 text-yellow border-yellow/20 text-xs">
						Medium
					</Badge>
				);
			case "low":
				return (
					<Badge className="bg-green/10 text-green border-green/20 text-xs">
						Low
					</Badge>
				);
			default:
				return null;
		}
	};

	// Format content preview (strip HTML and limit length)
	const contentPreview =
		content
			.replace(/<[^>]*>/g, "")
			.substring(0, 150)
			.trim() + (content.length > 150 ? "..." : "");

	return (
		<div className="group cursor-pointer">
			<Card className="glass-card hover:shadow-drop-3 transition-all duration-300 overflow-hidden mb-4">
				<div className="glass-card-cap z-10" />

				{/* Featured Image */}
				<div className="relative w-full h-full mt-4 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
					{image ? (
						<img
							src={image}
							alt={title}
							className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center min-h-[200px]">
							<Newspaper className="w-16 h-16 text-light-300" />
						</div>
					)}

					{/* Type Badge Overlay */}
					<div className="absolute top-6 left-3">
						<Badge
							variant="outline"
							className={`text-xs px-3 py-1 backdrop-blur-xl bg-white/90 border-white/40 shadow-lg ${getTypeColor(
								type,
							)}`}
						>
							<span className="flex items-center gap-1">
								{getTypeIcon(type)}
								{type}
							</span>
						</Badge>
					</div>

					{/* Department Badge */}
					{department && (
						<div className="absolute top-6 right-3">
							<Badge className="text-xs px-3 py-1 backdrop-blur-md bg-dark-200/80 text-white border-dark-100/40 shadow-lg">
								{department}
							</Badge>
						</div>
					)}

					{/* Priority Badge */}
					<div className="absolute bottom-3 right-3">
						{getPriorityBadge(priority)}
					</div>
				</div>
			</Card>

			{/* Content Below Card */}
			<div className="space-y-3">
				{/* Title */}
				<h3 className="text-lg font-semibold sidebar-gradient-text line-clamp-2 group-hover:text-blue-600 transition-colors">
					{title || "Article Title"}
				</h3>

				{/* Content Preview */}
				<p className="text-sm text-light-100 line-clamp-3">
					{contentPreview || "Article content preview..."}
				</p>

				{/* Metadata Footer */}
				<div className="flex items-center justify-between pt-2 border-t border-slate-200">
					<div className="flex items-center gap-2 text-xs text-slate-500">
						<User className="h-3.5 w-3.5" />
						<span className="font-medium">{author}</span>
					</div>
					<div className="flex items-center gap-2 text-xs text-light-200">
						<Calendar className="h-3.5 w-3.5" />
						<span>{format(new Date(date), "MMM dd, yyyy")}</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ArticlePreview;
