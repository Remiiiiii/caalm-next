import React from "react";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import DashboardHeader2 from "@/components/DashboardHeader2";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex h-screen">
      <Sidebar />
      <section className="flex h-full w-full flex-1 flex-col">
        <MobileNavigation />
        <DashboardHeader2 />
        <div className="main-content">{children}</div>
      </section>
    </main>
  );
};

export default layout;
