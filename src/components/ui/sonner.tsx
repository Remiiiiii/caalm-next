"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toaster as Sonner, toast } from "sonner";
import { TOAST_Z_INDEX } from "@/lib/ui/modal-styles";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Portaled to document.body for the same reason as ToastViewport
 * (src/components/ui/toast.tsx): the layout nests this component inside a
 * `position: relative; z-index: 0` stacking context ((root)/layout.tsx),
 * which traps any z-index declared here. Dialog/AlertDialog content portals
 * to body directly, so without this a toast paints behind an open dialog's
 * backdrop regardless of its own z-index value.
 */
const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	if (!mounted) return null;

	return createPortal(
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			style={{ zIndex: TOAST_Z_INDEX }}
			toastOptions={{
				classNames: {
					toast:
						"group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg",
					description: "group-[.toast]:text-muted-foreground",
					actionButton:
						"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
					cancelButton:
						"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
				},
			}}
			{...props}
		/>,
		document.body,
	);
};

export { Toaster, toast };
