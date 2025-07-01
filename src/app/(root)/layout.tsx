import React from "react";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import DashboardHeader2 from "@/components/DashboardHeader2";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";

const layout = async ({ children }: { children: React.ReactNode }) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in");
  }
  return (
    <main className="flex h-screen">
      <Sidebar {...currentUser} />
      <section className="flex h-full w-full flex-1 flex-col">
        <MobileNavigation {...currentUser} />
        <DashboardHeader2 />
        <div className="main-content">{children}</div>
      </section>
    </main>
  );
};

export default layout;
