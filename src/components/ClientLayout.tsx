"use client";

import type { Models } from "appwrite";
import type React from "react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

interface ClientLayoutProps {
	user: Models.User<Models.Preferences>;
	children: React.ReactNode;
}

const ClientLayout = ({ user, children }: ClientLayoutProps) => {
	return <AuthenticatedLayout user={user}>{children}</AuthenticatedLayout>;
};

export default ClientLayout;
