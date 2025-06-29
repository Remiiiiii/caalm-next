import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, Bell, Mail, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DashboardHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/sign-in");
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "head_admin":
        return "Executive";
      case "manager":
        return "Manager";
      case "hr_admin":
        return "HR Administrator";
      default:
        return role;
    }
  };

  return (
    <header className="bg-background shadow-drop-1 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-coral" />
            <span className="ml-2 text-2xl font-bold text-navy font-poppins">
              CAALM Solutions
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-foreground">
              <p className="font-medium text-navy">{user?.name}</p>
              <p className="text-xs text-slate-dark">
                {getRoleDisplay(user?.role || "")} - {user?.department}
              </p>
            </div>

            <Button variant="ghost" size="icon" className="hover:bg-coral/10">
              <Bell className="h-5 w-5 text-slate-dark" />
            </Button>

            <Button variant="ghost" size="icon" className="hover:bg-coral/10">
              <Mail className="h-5 w-5 text-slate-dark" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-coral/10"
            >
              <LogOut className="h-5 w-5 text-slate-dark" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
