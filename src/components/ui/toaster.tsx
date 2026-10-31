"use client";

// Toasts are now rendered by Sonner via caalmToast (see src/lib/ui/caalm-toast.ts).
// This file is kept as a no-op so existing imports don't break.
import { ToastProvider, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
	return (
		<ToastProvider>
			<ToastViewport />
		</ToastProvider>
	);
}
