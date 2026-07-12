"use client";

import { AlertTriangle } from "lucide-react";
import type React from "react";
import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

class AnalyticsErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error(
			"Analytics Error Boundary caught an error:",
			error,
			errorInfo,
		);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="p-6 text-center">
						<div className="flex items-center justify-center gap-2 text-red-600 mb-4">
							<AlertTriangle className="h-5 w-5" aria-hidden />
							<span>Error Loading Analytics</span>
						</div>
						<p className="text-red-700 mb-4">
							{this.state.error?.message || "An unexpected error occurred"}
						</p>
						<button
							onClick={() =>
								this.setState({ hasError: false, error: undefined })
							}
							className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 cursor-pointer"
						>
							Try Again
						</button>
					</div>
				)
			);
		}

		return this.props.children;
	}
}

export default AnalyticsErrorBoundary;
